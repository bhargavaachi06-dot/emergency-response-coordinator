const crypto = require("crypto");
const nodemailer = require("nodemailer");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const pool = require("../db");

const JWT_SECRET = process.env.JWT_SECRET || "emergency_response_secure_jwt_token_key_2026";
const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_VERIFICATION_ATTEMPTS = 5;

// Lazy Google OAuth2 Client
let googleAuthClient = null;

function getGoogleAuthClient() {
  if (!googleAuthClient) {
    googleAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return googleAuthClient;
}

/**
 * Verify Google ID Token against Google servers and expected client ID (audience)
 * @param {string} idToken - The Google ID Token JWT
 * @returns {Promise<object>} Decoded token payload with verified email, name, picture, sub
 */
async function verifyGoogleIdToken(idToken) {
  const expectedClientId = (process.env.GOOGLE_CLIENT_ID || "").trim();
  if (!expectedClientId) {
    const error = new Error("GOOGLE_CLIENT_ID is not configured on the server.");
    error.code = "GOOGLE_NOT_CONFIGURED";
    throw error;
  }

  if (!idToken || typeof idToken !== "string" || !idToken.trim()) {
    const error = new Error("Google ID token is required.");
    error.code = "INVALID_TOKEN";
    throw error;
  }

  try {
    const client = getGoogleAuthClient();
    const ticket = await client.verifyIdToken({
      idToken: idToken.trim(),
      audience: expectedClientId,
    });
    const payload = ticket.getPayload();

    if (!payload || !payload.sub) {
      const error = new Error("Invalid Google token payload.");
      error.code = "INVALID_PAYLOAD";
      throw error;
    }

    if (!payload.email || !payload.email_verified) {
      const error = new Error("Google account email is not verified.");
      error.code = "UNVERIFIED_EMAIL";
      throw error;
    }

    return {
      googleId: payload.sub,
      email: payload.email.toLowerCase().trim(),
      name: payload.name || "Google User",
      picture: payload.picture || null,
      emailVerified: Boolean(payload.email_verified),
    };
  } catch (err) {
    if (err.code === "GOOGLE_NOT_CONFIGURED" || err.code === "UNVERIFIED_EMAIL") {
      throw err;
    }
    const error = new Error(`Invalid or expired Google token: ${err.message}`);
    error.code = "TOKEN_VERIFICATION_FAILED";
    throw error;
  }
}

// ============================================================
// EMAIL TRANSPORTER CONFIGURATION
// ============================================================
let emailTransporter = null;

function getEmailTransporter() {
  if (emailTransporter) return emailTransporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS) {
    emailTransporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: Number(process.env.SMTP_PORT) === 465,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Development fallback using json/stream transport to prevent crashes when SMTP credentials are not yet set
    console.warn("[AUTH] SMTP environment variables (SMTP_HOST, SMTP_USER, SMTP_PASS) not configured. Using stream buffer transport.");
    emailTransporter = nodemailer.createTransport({
      streamTransport: true,
      newline: "unix",
      buffer: true,
    });
  }
  return emailTransporter;
}

// ============================================================
// CRYPTOGRAPHIC HELPERS
// ============================================================
function generateSecureOTP() {
  // Cryptographically secure 6-digit number between 100000 and 999999
  return crypto.randomInt(100000, 1000000).toString();
}

function hashOTP(otp, salt) {
  return crypto.createHash("sha256").update(otp + salt).digest("hex");
}

// ============================================================
// OTP CREATION & RESEND COOLDOWN CHECK
// ============================================================
async function createAndStoreOTP(identifier, type) {
  const normalizedId = identifier.trim().toLowerCase();

  // Check resend cooldown
  const recentOtpResult = await pool.query(
    `SELECT created_at FROM otps 
     WHERE identifier = $1 AND type = $2 AND used = FALSE 
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedId, type]
  );

  if (recentOtpResult.rows.length > 0) {
    const elapsedSeconds = Math.floor(
      (Date.now() - new Date(recentOtpResult.rows[0].created_at).getTime()) / 1000
    );
    if (elapsedSeconds < RESEND_COOLDOWN_SECONDS) {
      const waitSeconds = RESEND_COOLDOWN_SECONDS - elapsedSeconds;
      throw new Error(`Please wait ${waitSeconds}s before requesting a new OTP`);
    }
  }

  // Invalidate any older unused OTPs for this identifier and type
  await pool.query(
    `UPDATE otps SET used = TRUE 
     WHERE identifier = $1 AND type = $2 AND used = FALSE`,
    [normalizedId, type]
  );

  // Generate cryptographically secure OTP & salt
  const otp = generateSecureOTP();
  const salt = crypto.randomBytes(16).toString("hex");
  const otpHash = hashOTP(otp, salt);
  const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

  // Store only the salt and hash - NEVER the raw OTP
  await pool.query(
    `INSERT INTO otps (identifier, type, otp_hash, salt, max_attempts, expires_at)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [normalizedId, type, otpHash, salt, MAX_VERIFICATION_ATTEMPTS, expiresAt]
  );

  return { otp, normalizedId, expiresAt };
}

// ============================================================
// VERIFY OTP (STRICT SECURITY CONTROLS)
// ============================================================
async function verifyStoredOTP(identifier, type, inputOTP) {
  const normalizedId = identifier.trim().toLowerCase();

  if (!inputOTP || typeof inputOTP !== "string" || inputOTP.trim().length !== 6) {
    throw new Error("Invalid OTP format. Please enter a 6-digit code.");
  }

  const cleanOtp = inputOTP.trim();

  // Find the latest active OTP for this identifier
  const otpResult = await pool.query(
    `SELECT * FROM otps 
     WHERE identifier = $1 AND type = $2 AND used = FALSE 
     ORDER BY created_at DESC LIMIT 1`,
    [normalizedId, type]
  );

  if (otpResult.rows.length === 0) {
    throw new Error("No active OTP found. Please request a new OTP.");
  }

  const record = otpResult.rows[0];

  // Check expiration
  if (new Date() > new Date(record.expires_at)) {
    await pool.query(`UPDATE otps SET used = TRUE WHERE id = $1`, [record.id]);
    throw new Error("OTP has expired. Please request a new OTP.");
  }

  // Check max attempts
  if (record.attempts >= record.max_attempts) {
    await pool.query(`UPDATE otps SET used = TRUE WHERE id = $1`, [record.id]);
    throw new Error("Too many failed attempts. Please request a new OTP.");
  }

  // Hash input OTP with stored salt
  const computedHash = hashOTP(cleanOtp, record.salt);

  if (computedHash !== record.otp_hash) {
    const updatedAttempts = record.attempts + 1;
    await pool.query(
      `UPDATE otps SET attempts = $1 WHERE id = $2`,
      [updatedAttempts, record.id]
    );

    const remainingAttempts = record.max_attempts - updatedAttempts;
    if (remainingAttempts <= 0) {
      await pool.query(`UPDATE otps SET used = TRUE WHERE id = $1`, [record.id]);
      throw new Error("Too many failed attempts. Please request a new OTP.");
    }
    throw new Error(`Incorrect OTP. ${remainingAttempts} attempts remaining.`);
  }

  // Mark as used (one-time use)
  await pool.query(
    `UPDATE otps SET used = TRUE WHERE id = $1`,
    [record.id]
  );

  return { success: true };
}

// ============================================================
// SEND EMAIL OTP
// ============================================================
async function sendEmailOTP(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!email || !emailRegex.test(email.trim())) {
    throw new Error("Please enter a valid email address");
  }

  const { otp, normalizedId } = await createAndStoreOTP(email, "EMAIL");

  const transporter = getEmailTransporter();
  const fromAddress = process.env.SMTP_FROM || '"Emergency Response Coordinator" <no-reply@emergencyresponse.org>';

  const mailOptions = {
    from: fromAddress,
    to: normalizedId,
    subject: "Your Verification Code - Emergency Response Coordinator",
    text: `Your Emergency Response Coordinator verification code is: ${otp}\n\nThis code will expire in ${OTP_EXPIRY_MINUTES} minutes.\nDo not share this code with anyone.`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 24px; border: 1px solid #e2e8f0; border-radius: 8px;">
        <h2 style="color: #dc2626; margin-bottom: 8px;">Emergency Response Coordinator</h2>
        <p style="color: #475569; font-size: 14px;">Use the verification code below to complete your authentication.</p>
        <div style="background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
          <span style="font-size: 32px; font-weight: bold; letter-spacing: 6px; color: #0f172a;">${otp}</span>
        </div>
        <p style="color: #64748b; font-size: 13px;">This code expires in <strong>${OTP_EXPIRY_MINUTES} minutes</strong>. For your security, never share this code.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[AUTH] Email verification code dispatched to ${normalizedId}`);
    return { success: true, message: "OTP sent to your email" };
  } catch (error) {
    console.error("[AUTH] Email dispatch error:", error.message);
    throw new Error("Unable to send verification email. Please check the address or try again later.");
  }
}

// ============================================================
// SEND MOBILE OTP
// ============================================================
async function sendMobileOTP(countryCode, mobileNumber) {
  const cleanCode = (countryCode || "+91").trim();
  const cleanNumber = (mobileNumber || "").replace(/\D/g, "");

  if (!cleanNumber || cleanNumber.length < 8 || cleanNumber.length > 15) {
    throw new Error("Please enter a valid mobile number");
  }

  const fullMobile = `${cleanCode} ${cleanNumber}`;
  const identifier = `${cleanCode}${cleanNumber}`;

  // Store secure OTP in DB with cooldown & attempt limits
  const { otp } = await createAndStoreOTP(identifier, "MOBILE");

  // In production, integrate SMS Gateway (Twilio REST API without heavy external dependencies)
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_PHONE) {
    try {
      const sid = process.env.TWILIO_ACCOUNT_SID;
      const token = process.env.TWILIO_AUTH_TOKEN;
      const from = process.env.TWILIO_PHONE;
      const to = `${cleanCode}${cleanNumber}`;
      const params = new URLSearchParams({
        To: to,
        From: from,
        Body: `Emergency Response Coordinator code: ${otp}. Valid for 10 minutes.`,
      });
      const authHeader = "Basic " + Buffer.from(`${sid}:${token}`).toString("base64");
      const twilioRes = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
        method: "POST",
        headers: {
          Authorization: authHeader,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: params.toString(),
      });
      if (twilioRes.ok) {
        console.log(`[AUTH] SMS OTP dispatched via Twilio to ${cleanCode}XXXXXX${cleanNumber.slice(-4)}`);
      } else {
        const errJson = await twilioRes.json().catch(() => ({}));
        console.error(`[AUTH] Twilio SMS API error (${twilioRes.status}):`, errJson.message || "Failed to dispatch SMS");
      }
    } catch (err) {
      console.error("[AUTH] Twilio SMS dispatch error:", err.message);
    }
  } else {
    // Secure provider status log (never log raw OTP)
    console.log(`[AUTH] Mobile OTP generated and securely stored in database for ${cleanCode}XXXXXX${cleanNumber.slice(-4)}`);
  }

  return {
    success: true,
    fullMobile,
    message: `OTP sent to ${fullMobile}`,
  };
}

// ============================================================
// JWT TOKEN GENERATION & VERIFICATION
// ============================================================
function generateJWT(user) {
  return jwt.sign(
    {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role || "citizen",
      mobile: user.mobile,
      mobile_verified: Boolean(user.mobile_verified),
      email_verified: Boolean(user.email_verified),
      profile_photo: user.profile_photo,
      auth_provider: user.auth_provider,
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

function verifyJWT(token) {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

// Authentication Express Middleware
function authenticateToken(req, res, next) {
  const rawAuthHeader = req.headers["authorization"] || req.headers["Authorization"];
  let token = null;

  if (rawAuthHeader && typeof rawAuthHeader === "string") {
    if (rawAuthHeader.startsWith("Bearer ") || rawAuthHeader.startsWith("bearer ")) {
      token = rawAuthHeader.slice(7).trim();
    } else {
      token = rawAuthHeader.trim();
    }
  }

  if (!token) {
    return res.status(401).json({ success: false, message: "Authentication required" });
  }

  const decoded = verifyJWT(token);
  if (!decoded) {
    return res.status(403).json({ success: false, message: "Invalid or expired session. Please login again." });
  }

  req.user = decoded;
  next();
}

// Optional Authentication Middleware (identifies user if token is present, continues as guest if not)
function optionalAuthenticate(req, res, next) {
  const rawAuthHeader = req.headers["authorization"] || req.headers["Authorization"];
  let token = null;

  if (rawAuthHeader && typeof rawAuthHeader === "string") {
    if (rawAuthHeader.startsWith("Bearer ") || rawAuthHeader.startsWith("bearer ")) {
      token = rawAuthHeader.slice(7).trim();
    } else {
      token = rawAuthHeader.trim();
    }
  }

  if (token) {
    const decoded = verifyJWT(token);
    if (decoded) {
      req.user = decoded;
    }
  }

  next();
}

// Role-Based Authorization Middleware (enforces role check when user is authenticated)
function requireRole(...allowedRoles) {
  const normalized = allowedRoles.map((r) => String(r).toLowerCase());

  return (req, res, next) => {
    // If user is authenticated, strictly enforce role access
    if (req.user) {
      const userRole = String(req.user.role || "").toLowerCase();
      if (!normalized.includes(userRole) && userRole !== "admin") {
        return res.status(403).json({
          success: false,
          message: `Access denied. Your role (${userRole}) is not authorized for this operation. Required: ${allowedRoles.join(", ")}`,
        });
      }
    }
    // Continue
    next();
  };
}

module.exports = {
  createAndStoreOTP,
  verifyStoredOTP,
  sendEmailOTP,
  sendMobileOTP,
  generateJWT,
  verifyJWT,
  authenticateToken,
  optionalAuthenticate,
  requireRole,
  verifyGoogleIdToken,
};
