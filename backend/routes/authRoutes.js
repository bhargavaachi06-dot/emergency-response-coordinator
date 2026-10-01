const express = require("express");
const pool = require("../db");
const {
  sendEmailOTP,
  sendMobileOTP,
  verifyStoredOTP,
  generateJWT,
  authenticateToken,
} = require("../services/authService");

const router = express.Router();

// ============================================================
// 1. MOBILE OTP - SEND
// ============================================================
router.post("/mobile/send-otp", async (req, res) => {
  try {
    const { countryCode, mobileNumber } = req.body;

    if (!mobileNumber || typeof mobileNumber !== "string") {
      return res.status(400).json({
        success: false,
        message: "Mobile number is required",
      });
    }

    const result = await sendMobileOTP(countryCode, mobileNumber);
    return res.json(result);
  } catch (error) {
    console.error("Send mobile OTP error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to send mobile OTP",
    });
  }
});

// ============================================================
// 2. MOBILE OTP - VERIFY
// ============================================================
router.post("/mobile/verify-otp", async (req, res) => {
  try {
    const { countryCode, mobileNumber, otp, isLogin } = req.body;

    const cleanCode = (countryCode || "+91").trim();
    const cleanNumber = (mobileNumber || "").replace(/\D/g, "");
    const identifier = `${cleanCode}${cleanNumber}`;
    const fullMobile = `${cleanCode} ${cleanNumber}`;

    // Verify cryptographic salted hash in database
    await verifyStoredOTP(identifier, "MOBILE", otp);

    if (isLogin) {
      // Look up user by mobile
      const userResult = await pool.query(
        `SELECT * FROM users 
         WHERE mobile = $1 OR mobile = $2 OR mobile = $3 
         LIMIT 1`,
        [fullMobile, `${cleanCode}${cleanNumber}`, cleanNumber]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        // Ensure mobile_verified flag is true
        if (!user.mobile_verified) {
          await pool.query(
            `UPDATE users SET mobile_verified = TRUE, updated_at = NOW() WHERE id = $1`,
            [user.id]
          );
          user.mobile_verified = true;
        }

        const token = generateJWT(user);
        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            role: user.role || "citizen",
            mobile_verified: true,
            email_verified: Boolean(user.email_verified),
            profile_photo: user.profile_photo,
            auth_provider: user.auth_provider,
          },
          message: "Logged in successfully",
        });
      } else {
        // User not found for login
        return res.json({
          success: true,
          needsRegistration: true,
          verified: true,
          fullMobile,
          message: "Mobile verified. Please complete account sign up.",
        });
      }
    }

    // Sign up or generic verification success
    return res.json({
      success: true,
      verified: true,
      fullMobile,
      message: "Mobile Verified ✓",
    });
  } catch (error) {
    console.error("Verify mobile OTP error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid or expired OTP",
    });
  }
});

// ============================================================
// 3. EMAIL OTP - SEND
// ============================================================
router.post("/email/send-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "Email address is required",
      });
    }

    const result = await sendEmailOTP(email);
    return res.json(result);
  } catch (error) {
    console.error("Send email OTP error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to send email OTP",
    });
  }
});

// ============================================================
// 4. EMAIL OTP - VERIFY
// ============================================================
router.post("/email/verify-otp", async (req, res) => {
  try {
    const { email, otp, isLogin } = req.body;
    const cleanEmail = (email || "").trim().toLowerCase();

    // Verify cryptographic salted hash in database
    await verifyStoredOTP(cleanEmail, "EMAIL", otp);

    if (isLogin) {
      // Look up user by email
      const userResult = await pool.query(
        `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
        [cleanEmail]
      );

      if (userResult.rows.length > 0) {
        const user = userResult.rows[0];
        // Ensure email_verified flag is true
        if (!user.email_verified) {
          await pool.query(
            `UPDATE users SET email_verified = TRUE, updated_at = NOW() WHERE id = $1`,
            [user.id]
          );
          user.email_verified = true;
        }

        const token = generateJWT(user);
        return res.json({
          success: true,
          token,
          user: {
            id: user.id,
            name: user.name,
            email: user.email,
            mobile: user.mobile,
            role: user.role || "citizen",
            mobile_verified: Boolean(user.mobile_verified),
            email_verified: true,
            profile_photo: user.profile_photo,
            auth_provider: user.auth_provider,
          },
          message: "Logged in successfully",
        });
      } else {
        return res.json({
          success: true,
          needsRegistration: true,
          verified: true,
          email: cleanEmail,
          message: "Email verified. Please complete account sign up.",
        });
      }
    }

    // Sign up or generic verification success
    return res.json({
      success: true,
      verified: true,
      email: cleanEmail,
      message: "Email Verified ✓",
    });
  } catch (error) {
    console.error("Verify email OTP error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Invalid or expired OTP",
    });
  }
});

// ============================================================
// 5. GOOGLE OAUTH AUTHENTICATION & ACCOUNT LINKING
// ============================================================
router.post("/google", async (req, res) => {
  try {
    const { email, name, photoUrl, googleId } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Google account email is required",
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (name || "Google User").trim();

    // Check for existing account with this email or googleId
    const existing = await pool.query(
      `SELECT * FROM users 
       WHERE LOWER(email) = $1 OR (google_id IS NOT NULL AND google_id = $2) 
       LIMIT 1`,
      [cleanEmail, googleId || ""]
    );

    let user;

    if (existing.rows.length > 0) {
      user = existing.rows[0];

      // Link Google ID and update photo if not present
      const updated = await pool.query(
        `UPDATE users 
         SET google_id = COALESCE(google_id, $1),
             email_verified = TRUE,
             profile_photo = COALESCE(profile_photo, $2),
             updated_at = NOW()
         WHERE id = $3
         RETURNING *`,
        [googleId || null, photoUrl || null, user.id]
      );
      user = updated.rows[0];
    } else {
      // New user from Google
      const inserted = await pool.query(
        `INSERT INTO users 
         (name, email, profile_photo, google_id, auth_provider, email_verified, mobile_verified, role)
         VALUES ($1, $2, $3, $4, 'google', TRUE, FALSE, 'citizen')
         RETURNING *`,
        [cleanName, cleanEmail, photoUrl || null, googleId || null]
      );
      user = inserted.rows[0];
    }

    // Requirement: "If mobile verification is required by this application and the Google account does not already have a verified mobile number:
    // Google Login -> Get Google account -> Ask mobile number -> Send Mobile OTP -> Verify Mobile OTP -> Continue"
    if (!user.mobile || !user.mobile_verified) {
      return res.json({
        success: true,
        needsMobile: true,
        user: {
          id: user.id,
          name: user.name,
          email: user.email,
          profile_photo: user.profile_photo,
        },
        message: "Google authenticated. Mobile verification required.",
      });
    }

    // Google user has verified mobile -> complete authentication immediately
    const token = generateJWT(user);
    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role || "citizen",
        mobile_verified: true,
        email_verified: true,
        profile_photo: user.profile_photo,
        auth_provider: user.auth_provider,
      },
      message: "Logged in with Google successfully",
    });
  } catch (error) {
    console.error("Google authentication error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Google authentication failed",
    });
  }
});

// ============================================================
// 6. GOOGLE ACCOUNT - LINK VERIFIED MOBILE
// ============================================================
router.post("/google/link-mobile", async (req, res) => {
  try {
    const { email, countryCode, mobileNumber, otp } = req.body;

    const cleanEmail = (email || "").trim().toLowerCase();
    const cleanCode = (countryCode || "+91").trim();
    const cleanNumber = (mobileNumber || "").replace(/\D/g, "");
    const identifier = `${cleanCode}${cleanNumber}`;
    const fullMobile = `${cleanCode} ${cleanNumber}`;

    if (!cleanEmail) {
      return res.status(400).json({ success: false, message: "Email is required" });
    }

    // Verify OTP
    await verifyStoredOTP(identifier, "MOBILE", otp);

    // Update user record with verified mobile
    const result = await pool.query(
      `UPDATE users 
       SET mobile = $1, mobile_verified = TRUE, updated_at = NOW() 
       WHERE LOWER(email) = $2 
       RETURNING *`,
      [fullMobile, cleanEmail]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User account not found" });
    }

    const user = result.rows[0];
    const token = generateJWT(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role || "citizen",
        mobile_verified: true,
        email_verified: Boolean(user.email_verified),
        profile_photo: user.profile_photo,
        auth_provider: user.auth_provider,
      },
      message: "Mobile verified and linked successfully",
    });
  } catch (error) {
    console.error("Google link mobile error:", error.message);
    return res.status(400).json({
      success: false,
      message: error.message || "Failed to link mobile",
    });
  }
});

// ============================================================
// 7. SIGN UP - REGISTER USER (AFTER BOTH OTPS VERIFIED)
// ============================================================
router.post("/register", async (req, res) => {
  try {
    const { name, email, countryCode, mobileNumber, profilePhoto } = req.body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return res.status(400).json({ success: false, message: "Full name is required" });
    }
    if (!email || typeof email !== "string" || !email.trim()) {
      return res.status(400).json({ success: false, message: "Email address is required" });
    }
    if (!mobileNumber) {
      return res.status(400).json({ success: false, message: "Mobile number is required" });
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanCode = (countryCode || "+91").trim();
    const cleanNumber = (mobileNumber || "").replace(/\D/g, "");
    const fullMobile = `${cleanCode} ${cleanNumber}`;

    // Check if user already exists
    const existing = await pool.query(
      `SELECT * FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [cleanEmail]
    );

    let user;

    if (existing.rows.length > 0) {
      // Update existing record
      const updated = await pool.query(
        `UPDATE users 
         SET name = $1, 
             mobile = $2, 
             mobile_verified = TRUE, 
             email_verified = TRUE, 
             profile_photo = COALESCE($3, profile_photo),
             updated_at = NOW()
         WHERE id = $4
         RETURNING *`,
        [cleanName, fullMobile, profilePhoto || null, existing.rows[0].id]
      );
      user = updated.rows[0];
    } else {
      // Create new registered citizen
      const inserted = await pool.query(
        `INSERT INTO users 
         (name, email, mobile, mobile_verified, email_verified, profile_photo, role, auth_provider)
         VALUES ($1, $2, $3, TRUE, TRUE, $4, 'citizen', 'local')
         RETURNING *`,
        [cleanName, cleanEmail, fullMobile, profilePhoto || null]
      );
      user = inserted.rows[0];
    }

    const token = generateJWT(user);

    return res.json({
      success: true,
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile,
        role: user.role || "citizen",
        mobile_verified: true,
        email_verified: true,
        profile_photo: user.profile_photo,
        auth_provider: user.auth_provider,
      },
      message: "Account created successfully",
    });
  } catch (error) {
    console.error("Register user error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to create account",
    });
  }
});

// ============================================================
// 8. CURRENT USER PROFILE (FROM JWT)
// ============================================================
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, mobile, role, mobile_verified, email_verified, profile_photo, auth_provider, created_at
       FROM users WHERE id = $1 LIMIT 1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    return res.json({
      success: true,
      user: result.rows[0],
    });
  } catch (error) {
    console.error("Get user me error:", error.message);
    return res.status(500).json({
      success: false,
      message: error.message || "Failed to load user profile",
    });
  }
});

module.exports = router;
