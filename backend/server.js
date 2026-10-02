const express = require("express");
const cors = require("cors");
const pool = require("./db");
const { analyzeEmergency } = require("./services/aiService");
const hindsightService = require("./services/hindsightService");
const initDatabase = require("./services/databaseInit");
const authRoutes = require("./routes/authRoutes");

const app = express();
const PORT = process.env.PORT || 5000;

const ALLOWED_ORIGINS = [
  "https://emergency-response-coordinator.vercel.app",
  "http://localhost:5173",
  "http://localhost:3000",
  "http://localhost:5000",
  "capacitor://localhost",
  "http://localhost",
  "https://localhost",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (such as mobile apps, Postman, curl, or server-to-server)
    if (!origin) return callback(null, true);

    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }

    // Allow all Vercel deployment preview origins (*.vercel.app)
    if (/^https:\/\/[a-zA-Z0-9_-]+\.vercel\.app$/.test(origin)) {
      return callback(null, true);
    }

    // Allow local network IP testing for mobile devices
    if (/^http:\/\/192\.168\.\d+\.\d+(:\d+)?$/.test(origin) || /^http:\/\/10\.\d+\.\d+\.\d+(:\d+)?$/.test(origin)) {
      return callback(null, true);
    }

    return callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// ==========================================
// AUTHENTICATION ROUTES
// ==========================================
app.use("/api/auth", authRoutes);

// ==========================================
// HOME
// ==========================================
app.get("/", (req, res) => {
  res.json({
    message: "Emergency Response Coordinator API is running 🚨"
  });
});

// ==========================================
// HEALTH CHECK
// ==========================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Emergency Response Coordinator",
    auth: {
      status: "ready",
      endpoints: [
        "/api/auth/mobile/send-otp",
        "/api/auth/mobile/verify-otp",
        "/api/auth/email/send-otp",
        "/api/auth/email/verify-otp",
        "/api/auth/google",
        "/api/auth/google/link-mobile",
        "/api/auth/register",
        "/api/auth/me",
      ],
    },
  });
});

// ==========================================
// DATABASE TEST
// ==========================================
app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "OK",
      database: "PostgreSQL connected",
      time: result.rows[0].now
    });
  } catch (error) {
    console.error("Database error:", error);

    res.status(500).json({
      status: "ERROR",
      message: error.message
    });
  }
});

// ==========================================
// HINDSIGHT MEMORY HEALTH CHECK
// ==========================================
app.get("/api/memory/health", async (req, res) => {
  try {
    const health = await hindsightService.healthCheck();
    res.json(health);
  } catch (error) {
    console.error("Memory health check error:", error);
    res.status(500).json({
      configured: false,
      available: false,
      error: error.message
    });
  }
});

// ==========================================
// CREATE EMERGENCY
// ==========================================
app.post("/api/emergencies", async (req, res) => {
  try {
    const {
      type,
      description,
      locationText,   // camelCase sent by frontend emergencyService.submit()
      location_text,  // snake_case database field alias
      location,       // fallback alias
      latitude,
      longitude
    } = req.body;

    if (!type || !description) {
      return res.status(400).json({
        message: "Emergency type and description are required"
      });
    }

    const maxResult = await pool.query(
      "SELECT COALESCE(MAX(id), 0) + 1 AS next_id FROM emergencies"
    );

    const nextNumber =
      1000 + Number(maxResult.rows[0].next_id);

    const emergencyCode = `ER-${nextNumber}`;

    // Accept locationText, location_text, or location (string or object with address)
    const resolvedLocationText =
      (locationText && typeof locationText === "string" && locationText.trim()) ||
      (location_text && typeof location_text === "string" && location_text.trim()) ||
      (location && typeof location === "string" && location.trim()) ||
      (location?.address && typeof location.address === "string" && location.address.trim()) ||
      "Unknown";

    const result = await pool.query(
      `INSERT INTO emergencies
      (
        emergency_code,
        type,
        description,
        location_text,
        latitude,
        longitude,
        severity,
        priority,
        status
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
      RETURNING *`,
      [
        emergencyCode,
        type,
        description,
        resolvedLocationText,
        latitude || null,
        longitude || null,
        "Pending",
        "Pending",
        "REPORTED"
      ]
    );

    const emergency = result.rows[0];

    // Handle optional media attachments (max 3 files, 10MB photo, 50MB video)
    let attachedMedia = [];
    if (Array.isArray(req.body.media) && req.body.media.length > 0) {
      for (const m of req.body.media.slice(0, 3)) {
        if (m && (m.data_url || m.dataUrl)) {
          const mediaType = m.media_type || m.mediaType || (m.mime_type?.startsWith("video") ? "video" : "image");
          const fileName = m.file_name || m.fileName || (mediaType === "video" ? "evidence.mp4" : "evidence.jpg");
          const mimeType = m.mime_type || m.mimeType || (mediaType === "video" ? "video/mp4" : "image/jpeg");
          const fileSize = Number(m.file_size || m.fileSize || 0);
          const dataUrl = m.data_url || m.dataUrl;

          if (mediaType === "image" && fileSize > 10 * 1024 * 1024) continue;
          if (mediaType === "video" && fileSize > 50 * 1024 * 1024) continue;

          const mediaRes = await pool.query(
            `INSERT INTO emergency_media
             (emergency_id, media_type, file_name, mime_type, file_size, data_url)
             VALUES ($1, $2, $3, $4, $5, $6)
             RETURNING id, emergency_id, media_type, file_name, mime_type, file_size, created_at`,
            [emergency.id, mediaType, fileName, mimeType, fileSize, dataUrl]
          );
          if (mediaRes.rows[0]) {
            attachedMedia.push(mediaRes.rows[0]);
          }
        }
      }
    }

    await pool.query(
      `INSERT INTO incident_events
      (emergency_id,event_type,description)
      VALUES ($1,$2,$3)`,
      [
        emergency.id,
        "REPORTED",
        attachedMedia.length > 0
          ? `Emergency reported with ${attachedMedia.length} visual evidence item(s)`
          : "Emergency reported by citizen"
      ]
    );

    // Spread emergency fields at top level so AppContext can access
    // createResult.data.emergency_code directly (not nested under .emergency)
    res.status(201).json({
      message: "Emergency reported successfully",
      ...emergency,
      media: attachedMedia,
      media_count: attachedMedia.length,
      photos_count: attachedMedia.filter((m) => m.media_type === "image").length,
      videos_count: attachedMedia.filter((m) => m.media_type === "video").length,
    });

  } catch (error) {
    console.error("Create emergency error:", error);

    res.status(500).json({
      message: "Failed to create emergency",
      error: error.message
    });
  }
});

// ==========================================
// UPLOAD / ATTACH MEDIA TO EMERGENCY
// ==========================================
app.post("/api/emergencies/:id/media", async (req, res) => {
  try {
    const emergencyResult = await pool.query(
      `SELECT id, emergency_code FROM emergencies WHERE emergency_code = $1 OR id::text = $1`,
      [req.params.id]
    );

    if (emergencyResult.rows.length === 0) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const emergency = emergencyResult.rows[0];
    const incoming = Array.isArray(req.body.media)
      ? req.body.media
      : req.body.data_url || req.body.dataUrl
      ? [req.body]
      : [];

    if (incoming.length === 0) {
      return res.status(400).json({ message: "No media data provided" });
    }

    // Check count constraint (max 3 per emergency)
    const existingCountRes = await pool.query(
      `SELECT COUNT(*) FROM emergency_media WHERE emergency_id = $1`,
      [emergency.id]
    );
    const existingCount = parseInt(existingCountRes.rows[0].count, 10);
    const availableSlots = Math.max(0, 3 - existingCount);

    if (availableSlots <= 0) {
      return res.status(400).json({ message: "Maximum of 3 media files already reached for this emergency." });
    }

    const inserted = [];
    for (const m of incoming.slice(0, availableSlots)) {
      const dataUrl = m.data_url || m.dataUrl;
      if (!dataUrl) continue;

      const mediaType = m.media_type || m.mediaType || (m.mime_type?.startsWith("video") ? "video" : "image");
      const fileName = m.file_name || m.fileName || (mediaType === "video" ? "evidence.mp4" : "evidence.jpg");
      const mimeType = m.mime_type || m.mimeType || (mediaType === "video" ? "video/mp4" : "image/jpeg");
      const fileSize = Number(m.file_size || m.fileSize || 0);

      // Validate constraints: Images <= 10MB, Videos <= 50MB
      if (mediaType === "image" && fileSize > 10 * 1024 * 1024) {
        return res.status(400).json({ message: "Image exceeds 10MB limit." });
      }
      if (mediaType === "video" && fileSize > 50 * 1024 * 1024) {
        return res.status(400).json({ message: "Video exceeds 50MB limit." });
      }

      const insRes = await pool.query(
        `INSERT INTO emergency_media
         (emergency_id, media_type, file_name, mime_type, file_size, data_url)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING id, emergency_id, media_type, file_name, mime_type, file_size, created_at`,
        [emergency.id, mediaType, fileName, mimeType, fileSize, dataUrl]
      );
      if (insRes.rows[0]) inserted.push(insRes.rows[0]);
    }

    res.status(201).json({
      message: `${inserted.length} media item(s) attached successfully`,
      media: inserted,
    });
  } catch (error) {
    console.error("Upload media error:", error);
    res.status(500).json({
      message: "Failed to upload evidence media",
      error: error.message,
    });
  }
});

// ==========================================
// GET MEDIA FOR EMERGENCY
// ==========================================
app.get("/api/emergencies/:id/media", async (req, res) => {
  try {
    const emergencyResult = await pool.query(
      `SELECT id FROM emergencies WHERE emergency_code = $1 OR id::text = $1`,
      [req.params.id]
    );

    if (emergencyResult.rows.length === 0) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const mediaResult = await pool.query(
      `SELECT id, emergency_id, media_type, file_name, mime_type, file_size, data_url, created_at
       FROM emergency_media
       WHERE emergency_id = $1
       ORDER BY created_at ASC`,
      [emergencyResult.rows[0].id]
    );

    res.json(mediaResult.rows);
  } catch (error) {
    console.error("Get emergency media error:", error);
    res.status(500).json({
      message: "Failed to fetch emergency media",
      error: error.message,
    });
  }
});

// ==========================================
// GET ALL EMERGENCIES
// ==========================================
app.get("/api/emergencies", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         e.*,
         COALESCE((SELECT COUNT(*) FROM emergency_media em WHERE em.emergency_id = e.id), 0)::int AS media_count,
         COALESCE((SELECT COUNT(*) FROM emergency_media em WHERE em.emergency_id = e.id AND em.media_type = 'image'), 0)::int AS photos_count,
         COALESCE((SELECT COUNT(*) FROM emergency_media em WHERE em.emergency_id = e.id AND em.media_type = 'video'), 0)::int AS videos_count
       FROM emergencies e
       ORDER BY e.created_at DESC`
    );

    const emergencies = result.rows.map((row) => {
      let ai = row.ai_analysis;
      if (typeof ai === "string") {
        try {
          ai = JSON.parse(ai);
        } catch {
          // ignore
        }
      }
      return {
        ...row,
        ai_analysis: ai,
        ai: ai,
      };
    });

    res.json(emergencies);

  } catch (error) {
    console.error("Get emergencies error:", error);

    res.status(500).json({
      message: "Failed to fetch emergencies",
      error: error.message
    });
  }
});

// ==========================================
// GET SINGLE EMERGENCY
// ==========================================
app.get("/api/emergencies/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM emergencies
       WHERE emergency_code = $1 OR id::text = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Emergency not found"
      });
    }

    const emergency = result.rows[0];

    let ai = emergency.ai_analysis;
    if (typeof ai === "string") {
      try {
        ai = JSON.parse(ai);
      } catch {
        // ignore
      }
    }

    // ------------------------------------------
    // Get responder assignments
    // ------------------------------------------
    const assignments = await pool.query(
      `SELECT
        a.id,
        a.status,
        a.dispatched_at,
        a.updated_at,
        r.name,
        r.type,
        r.phone
       FROM assignments a
       JOIN responders r
       ON a.responder_id = r.id
       WHERE a.emergency_id = $1
       ORDER BY a.id`,
      [emergency.id]
    );

    // ------------------------------------------
    // Get helper responses
    // ------------------------------------------
    const helperResponses = await pool.query(
      `SELECT
        hr.id,
        hr.response,
        hr.status,
        hr.responded_at,
        h.helper_code,
        h.name,
        h.phone
       FROM helper_responses hr
       JOIN helpers h
       ON hr.helper_id = h.id
       WHERE hr.emergency_id = $1
       ORDER BY hr.id`,
      [emergency.id]
    );

    // ------------------------------------------
    // Get incident timeline
    // ------------------------------------------
    const events = await pool.query(
      `SELECT *
       FROM incident_events
       WHERE emergency_id = $1
       ORDER BY created_at`,
      [emergency.id]
    );

    // ------------------------------------------
    // Get attached evidence media
    // ------------------------------------------
    const mediaResult = await pool.query(
      `SELECT id, emergency_id, media_type, file_name, mime_type, file_size, data_url, created_at
       FROM emergency_media
       WHERE emergency_id = $1
       ORDER BY created_at ASC`,
      [emergency.id]
    );

    const mediaRows = mediaResult.rows || [];

    res.json({
      ...emergency,
      ai_analysis: ai,
      ai: ai,
      responders: assignments.rows,
      helperResponses: helperResponses.rows,
      timeline: events.rows,
      media: mediaRows,
      media_count: mediaRows.length,
      photos_count: mediaRows.filter((m) => m.media_type === "image").length,
      videos_count: mediaRows.filter((m) => m.media_type === "video").length,
    });

  } catch (error) {
    console.error("Get emergency error:", error);

    res.status(500).json({
      message: "Failed to fetch emergency",
      error: error.message
    });
  }
});

// ==========================================
// GET MEMORY CONTEXT FOR EMERGENCY
// ==========================================
app.get("/api/emergencies/:id/memory-context", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM emergencies
       WHERE emergency_code = $1 OR id::text = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Emergency not found"
      });
    }

    const emergency = result.rows[0];
    const memoryContext = await hindsightService.getMemoryContext(emergency);
    res.json({
      emergencyCode: emergency.emergency_code,
      id: emergency.id,
      ...memoryContext
    });
  } catch (error) {
    console.error("Get memory context error:", error);
    res.status(500).json({
      message: "Failed to retrieve memory context",
      error: error.message
    });
  }
});

// ==========================================
// UPDATE EMERGENCY STATUS (Coordinator / Lifecycle)
// ==========================================
app.patch("/api/emergencies/:id/status", async (req, res) => {
  try {
    const { status, reason } = req.body;
    const allowedStatuses = [
      "REPORTED",
      "ANALYZING",
      "VERIFIED",
      "DISPATCHED",
      "RESPONDERS_EN_ROUTE",
      "ARRIVED",
      "RESOLVED",
      "CANCELLED",
    ];

    if (!status || !allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: `Invalid status. Allowed statuses: ${allowedStatuses.join(", ")}`,
      });
    }

    const emergencyResult = await pool.query(
      `SELECT * FROM emergencies WHERE emergency_code = $1 OR id::text = $1`,
      [req.params.id]
    );

    if (emergencyResult.rows.length === 0) {
      return res.status(404).json({ message: "Emergency not found" });
    }

    const emergency = emergencyResult.rows[0];

    await pool.query(
      `UPDATE emergencies SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2`,
      [status, emergency.id]
    );

    // If marked RESOLVED or CANCELLED, release responders and complete assignments
    if (status === "RESOLVED" || status === "CANCELLED") {
      await pool.query(
        `UPDATE responders SET status = 'AVAILABLE' WHERE id IN (
           SELECT responder_id FROM assignments WHERE emergency_id = $1
         )`,
        [emergency.id]
      );
      await pool.query(
        `UPDATE assignments SET status = 'COMPLETED', updated_at = CURRENT_TIMESTAMP WHERE emergency_id = $1`,
        [emergency.id]
      );
    }

    // Timeline event
    await pool.query(
      `INSERT INTO incident_events (emergency_id, event_type, description) VALUES ($1, $2, $3)`,
      [
        emergency.id,
        "EMERGENCY_STATUS",
        reason ? `Status changed to ${status}: ${reason}` : `Emergency status updated to ${status}`,
      ]
    );

    // Retain resolution in Hindsight if resolved
    if (status === "RESOLVED") {
      hindsightService.retainEmergencyMemory(
        {
          emergency_code: emergency.emergency_code,
          id: emergency.id,
          type: emergency.type,
          description: emergency.description,
          location_text: emergency.location_text,
        },
        "RESOLVED",
        { outcome: reason || "Coordinator closed incident. All responders cleared." }
      ).catch(err => console.warn(`[Status] Background retain failed: ${err.message}`));
    }

    res.json({
      message: `Emergency status updated to ${status}`,
      status,
      emergency_code: emergency.emergency_code,
      id: emergency.id,
    });
  } catch (error) {
    console.error("Update emergency status error:", error);
    res.status(500).json({
      message: "Failed to update emergency status",
      error: error.message,
    });
  }
});

// ==========================================
// AI EMERGENCY ANALYSIS (Memory-Aware)
// ==========================================
app.post("/api/emergencies/:id/analyze", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM emergencies
       WHERE emergency_code = $1 OR id::text = $1`,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Emergency not found"
      });
    }

    const emergency = result.rows[0];

    // ------------------------------------------
    // 1. Recall historical/active memory from Hindsight
    // Fail-safe: if Hindsight is unavailable, recallEmergencyMemory returns
    // { available: false, memoryCount: 0, memories: [], contextText: "" }
    // ------------------------------------------
    let memoryContext = null;
    try {
      memoryContext = await hindsightService.recallEmergencyMemory({
        emergency_code: emergency.emergency_code,
        id: emergency.id,
        type: emergency.type,
        description: emergency.description,
        locationText: emergency.location_text,
      });
    } catch (memErr) {
      console.warn(`[AI-Analyze] Memory recall failed (${memErr.message}), continuing without memory.`);
    }

    // ------------------------------------------
    // 2. Fetch citizen-attached visual evidence
    // ------------------------------------------
    const mediaResult = await pool.query(
      `SELECT id, emergency_id, media_type, file_name, mime_type, file_size, data_url, created_at
       FROM emergency_media
       WHERE emergency_id = $1
       ORDER BY created_at ASC`,
      [emergency.id]
    );
    const mediaItems = mediaResult.rows || [];

    // ------------------------------------------
    // 3. Call AI service (Gemini + Memory + Evidence → fallback)
    // ------------------------------------------
    const analysis = await analyzeEmergency({
      type:         emergency.type,
      description:  emergency.description,
      locationText: emergency.location_text,
      latitude:     emergency.latitude,
      longitude:    emergency.longitude,
    }, memoryContext, mediaItems);

    // ------------------------------------------
    // 3. Map priority to severity columns
    // We store both the rich ai_analysis blob AND
    // the top-level columns for quick DB queries.
    // ------------------------------------------
    await pool.query(
      `UPDATE emergencies
       SET
         type       = $1,
         severity   = $2,
         priority   = $3,
         status     = $4,
         ai_analysis = $5,
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $6`,
      [
        analysis.category,
        analysis.severity,
        analysis.priority,
        "ANALYZING",
        JSON.stringify(analysis),
        emergency.id
      ]
    );

    // ------------------------------------------
    // 4. Timeline event
    // ------------------------------------------
    const sourceLabel =
      analysis.source === "AI" ? "AI" : "Rule-based fallback";
    const memoryBadge = analysis.memoryContextUsed
      ? ` (🧠 Memory-assisted, ${analysis.memoryCount} context items)`
      : "";

    await pool.query(
      `INSERT INTO incident_events
      (emergency_id, event_type, description)
      VALUES ($1, $2, $3)`,
      [
        emergency.id,
        "AI_ANALYSIS",
        `${sourceLabel} classified emergency as ${analysis.category} (${analysis.priority} priority)${memoryBadge}`
      ]
    );

    // ------------------------------------------
    // 5. Retain analysis outcome in Hindsight (Async fail-safe)
    // ------------------------------------------
    hindsightService.retainEmergencyMemory(
      {
        emergency_code: emergency.emergency_code,
        id: emergency.id,
        type: emergency.type,
        description: emergency.description,
        location_text: emergency.location_text,
        priority: analysis.priority,
      },
      "ANALYZED",
      analysis
    ).catch(err => console.warn(`[AI-Analyze] Background retain failed: ${err.message}`));

    // ------------------------------------------
    // Return full analysis to frontend
    // ------------------------------------------
    res.json({
      message: "Emergency analyzed successfully",
      analysis,
    });

  } catch (error) {
    console.error("AI analysis error:", error);

    res.status(500).json({
      message: "Failed to analyze emergency",
      error: error.message
    });
  }
});


// ==========================================
// DISPATCH RESPONDERS
// ==========================================
app.post("/api/emergencies/:id/dispatch", async (req, res) => {
  try {
    const emergencyResult = await pool.query(
      `SELECT *
       FROM emergencies
       WHERE emergency_code = $1 OR id::text = $1`,
      [req.params.id]
    );

    if (emergencyResult.rows.length === 0) {
      return res.status(404).json({
        message: "Emergency not found"
      });
    }

    const emergency = emergencyResult.rows[0];

    const responderNames =
      req.body.responders ||
      emergency.ai_analysis?.recommendedResponders ||
      [];

    if (responderNames.length === 0) {
      return res.status(400).json({
        message: "No responders selected"
      });
    }

    const dispatchedResponders = [];

    // ------------------------------------------
    // Dispatch each responder
    // ------------------------------------------
    for (const name of responderNames) {

      let responderType;

      if (name.toLowerCase().includes("ambulance")) {
        responderType = "AMBULANCE";
      } else if (name.toLowerCase().includes("police")) {
        responderType = "POLICE";
      } else if (name.toLowerCase().includes("fire")) {
        responderType = "FIRE";
      } else {
        continue;
      }

      const responderResult = await pool.query(
        `SELECT *
         FROM responders
         WHERE type = $1
         AND status = 'AVAILABLE'
         ORDER BY id
         LIMIT 1`,
        [responderType]
      );

      if (responderResult.rows.length === 0) {
        continue;
      }

      const responder = responderResult.rows[0];

      const assignmentResult = await pool.query(
        `INSERT INTO assignments
        (emergency_id,responder_id,status)
        VALUES ($1,$2,$3)
        RETURNING *`,
        [
          emergency.id,
          responder.id,
          "DISPATCHED"
        ]
      );

      await pool.query(
        `UPDATE responders
         SET status = 'DISPATCHED'
         WHERE id = $1`,
        [responder.id]
      );

      dispatchedResponders.push({
        ...responder,
        assignmentId: assignmentResult.rows[0].id,
        status: "DISPATCHED"
      });
    }

    // ------------------------------------------
    // Update emergency status
    // ------------------------------------------
    await pool.query(
      `UPDATE emergencies
       SET
         status = 'DISPATCHED',
         updated_at = CURRENT_TIMESTAMP
       WHERE id = $1`,
      [emergency.id]
    );

    // ------------------------------------------
    // Timeline event
    // ------------------------------------------
    await pool.query(
      `INSERT INTO incident_events
      (emergency_id,event_type,description)
      VALUES ($1,$2,$3)`,
      [
        emergency.id,
        "DISPATCHED",
        "Professional responders dispatched"
      ]
    );

    // ------------------------------------------
    // Retain dispatch event in Hindsight
    // ------------------------------------------
    hindsightService.retainEmergencyMemory(
      {
        emergency_code: emergency.emergency_code,
        id: emergency.id,
        type: emergency.type,
        description: emergency.description,
        location_text: emergency.location_text,
      },
      "DISPATCHED",
      { responders: dispatchedResponders }
    ).catch(err => console.warn(`[Dispatch] Background retain failed: ${err.message}`));

    // Check if coordinator customized/overrode the initial AI responder recommendations
    const aiRecommended = emergency.ai_analysis?.recommendedResponders || [];
    if (aiRecommended.length > 0 && responderNames.length > 0) {
      const isOverride = responderNames.some(r => !aiRecommended.includes(r)) ||
                         aiRecommended.some(r => !responderNames.includes(r));
      if (isOverride) {
        hindsightService.retainEmergencyMemory(
          {
            emergency_code: emergency.emergency_code,
            id: emergency.id,
            type: emergency.type,
            description: emergency.description,
            location_text: emergency.location_text,
          },
          "COORDINATOR_OVERRIDE",
          {
            originalRecommendation: aiRecommended.join(", "),
            coordinatorDecision: responderNames.join(", "),
            reason: req.body.reason || "Coordinator customized responders based on situational command assessment",
          }
        ).catch(err => console.warn(`[Dispatch] Background override retain failed: ${err.message}`));
      }
    }

    res.json({
      message: "Responders dispatched successfully 🚨",
      responders: dispatchedResponders
    });

  } catch (error) {
    console.error("Dispatch error:", error);

    res.status(500).json({
      message: "Failed to dispatch responders",
      error: error.message
    });
  }
});

// ==========================================
// UPDATE RESPONDER STATUS
// ==========================================
app.patch(
  "/api/emergencies/:id/responders/:responderName/status",
  async (req, res) => {

    try {
      const { status } = req.body;

      const allowedStatuses = [
        "DISPATCHED",
        "ACCEPTED",
        "EN ROUTE",
        "ARRIVED",
        "COMPLETED"
      ];

      if (!allowedStatuses.includes(status)) {
        return res.status(400).json({
          message: "Invalid responder status"
        });
      }

      // ------------------------------------------
      // Find emergency
      // ------------------------------------------
      const emergencyResult = await pool.query(
        `SELECT *
         FROM emergencies
         WHERE emergency_code = $1 OR id::text = $1`,
        [req.params.id]
      );

      if (emergencyResult.rows.length === 0) {
        return res.status(404).json({
          message: "Emergency not found"
        });
      }

      const emergency = emergencyResult.rows[0];

      // ------------------------------------------
      // Find responder assignment
      // ------------------------------------------
      const assignmentResult = await pool.query(
        `SELECT
          a.id,
          a.status,
          r.id AS responder_id,
          r.name,
          r.type
         FROM assignments a
         JOIN responders r
         ON a.responder_id = r.id
         WHERE a.emergency_id = $1
         AND (
           LOWER(r.name) = LOWER($2)
           OR LOWER(r.type) = LOWER($2)
           OR LOWER(r.name) LIKE LOWER('%' || $2 || '%')
           OR LOWER($2) LIKE LOWER('%' || r.type || '%')
         )
         LIMIT 1`,
        [
          emergency.id,
          req.params.responderName
        ]
      );

      if (assignmentResult.rows.length === 0) {
        return res.status(404).json({
          message: "Responder not found"
        });
      }

      const assignment = assignmentResult.rows[0];

      // ------------------------------------------
      // Update assignment
      // ------------------------------------------
      await pool.query(
        `UPDATE assignments
         SET
           status = $1,
           updated_at = CURRENT_TIMESTAMP
         WHERE id = $2`,
        [
          status,
          assignment.id
        ]
      );

      // ------------------------------------------
      // Update responder availability
      // ------------------------------------------
      let responderStatus = status;

      if (status === "COMPLETED") {
        responderStatus = "AVAILABLE";
      }

      await pool.query(
        `UPDATE responders
         SET status = $1
         WHERE id = $2`,
        [
          responderStatus,
          assignment.responder_id
        ]
      );

      // ------------------------------------------
      // Add responder timeline event
      // ------------------------------------------
      await pool.query(
        `INSERT INTO incident_events
        (emergency_id,event_type,description)
        VALUES ($1,$2,$3)`,
        [
          emergency.id,
          "RESPONDER_STATUS",
          `${assignment.name} status changed to ${status}`
        ]
      );

      // ------------------------------------------
      // Determine emergency lifecycle status
      // ------------------------------------------
      let emergencyStatus = null;

      if (status === "EN ROUTE") {
        emergencyStatus = "RESPONDERS_EN_ROUTE";
      }

      if (status === "ARRIVED") {
        emergencyStatus = "ARRIVED";
      }

      // ------------------------------------------
      // When responder completes, check all
      // responders assigned to this emergency
      // ------------------------------------------
      if (status === "COMPLETED") {

        const remainingResponders = await pool.query(
          `SELECT COUNT(*) AS count
           FROM assignments
           WHERE emergency_id = $1
           AND status != 'COMPLETED'`,
          [emergency.id]
        );

        const remainingCount =
          Number(remainingResponders.rows[0].count);

        if (remainingCount === 0) {
          emergencyStatus = "RESOLVED";
        }
      }

      // ------------------------------------------
      // Update emergency status
      // ------------------------------------------
      if (emergencyStatus) {

        await pool.query(
          `UPDATE emergencies
           SET
             status = $1,
             updated_at = CURRENT_TIMESTAMP
           WHERE id = $2`,
          [
            emergencyStatus,
            emergency.id
          ]
        );

        // ----------------------------------------
        // Add emergency lifecycle event
        // ----------------------------------------
        await pool.query(
          `INSERT INTO incident_events
          (emergency_id,event_type,description)
          VALUES ($1,$2,$3)`,
          [
            emergency.id,
            "EMERGENCY_STATUS",
            `Emergency status changed to ${emergencyStatus}`
          ]
        );

        // ----------------------------------------
        // Retain lifecycle transitions in Hindsight
        // ----------------------------------------
        if (emergencyStatus === "ARRIVED") {
          hindsightService.retainEmergencyMemory(
            {
              emergency_code: emergency.emergency_code,
              id: emergency.id,
              type: emergency.type,
              description: emergency.description,
              location_text: emergency.location_text,
            },
            "ARRIVED",
            { responderName: assignment.name }
          ).catch(err => console.warn(`[ResponderStatus] Background retain failed: ${err.message}`));
        } else if (emergencyStatus === "RESOLVED") {
          hindsightService.retainEmergencyMemory(
            {
              emergency_code: emergency.emergency_code,
              id: emergency.id,
              type: emergency.type,
              description: emergency.description,
              location_text: emergency.location_text,
            },
            "RESOLVED",
            { outcome: `All responders completed operational tasks. Incident closed.` }
          ).catch(err => console.warn(`[ResponderStatus] Background retain failed: ${err.message}`));
        }
      }

      // ------------------------------------------
      // Response
      // ------------------------------------------
      res.json({
        message:
          `${assignment.name} status updated successfully`,

        responder: {
          name: assignment.name,
          type: assignment.type,
          status
        },

        emergencyStatus:
          emergencyStatus ||
          emergency.status
      });

    } catch (error) {

      console.error(
        "Responder status error:",
        error
      );

      res.status(500).json({
        message: "Failed to update responder status",
        error: error.message
      });
    }
  }
);

// ==========================================
// GET AVAILABLE HELPERS
// ==========================================
app.get("/api/helpers", async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT *
       FROM helpers
       WHERE available = TRUE
       ORDER BY id`
    );

    res.json(result.rows);

  } catch (error) {
    console.error("Get helpers error:", error);

    res.status(500).json({
      message: "Failed to fetch helpers",
      error: error.message
    });
  }
});

// ==========================================
// HELPER RESPONSE
// ==========================================
app.post(
  "/api/emergencies/:id/helper-response",
  async (req, res) => {

    try {
      const { helperId, response } = req.body;

      if (!["ACCEPTED", "DECLINED"].includes(response)) {
        return res.status(400).json({
          message: "Response must be ACCEPTED or DECLINED"
        });
      }

      // ------------------------------------------
      // Find emergency
      // ------------------------------------------
      const emergencyResult = await pool.query(
        `SELECT *
         FROM emergencies
         WHERE emergency_code = $1 OR id::text = $1`,
        [req.params.id]
      );

      if (emergencyResult.rows.length === 0) {
        return res.status(404).json({
          message: "Emergency not found"
        });
      }

      const emergency = emergencyResult.rows[0];

      // ------------------------------------------
      // Find helper
      // ------------------------------------------
      const helperResult = await pool.query(
        `SELECT *
         FROM helpers
         WHERE helper_code = $1 OR id::text = $1`,
        [String(helperId)]
      );

      if (helperResult.rows.length === 0) {
        return res.status(404).json({
          message: "Helper not found"
        });
      }

      const helper = helperResult.rows[0];

      // ------------------------------------------
      // Helper status
      // ------------------------------------------
      const helperStatus =
        response === "ACCEPTED"
          ? "ASSISTING"
          : "DECLINED";

      // ------------------------------------------
      // Save helper response
      // ------------------------------------------
      const result = await pool.query(
        `INSERT INTO helper_responses
        (
          emergency_id,
          helper_id,
          response,
          status
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *`,
        [
          emergency.id,
          helper.id,
          response,
          helperStatus
        ]
      );

      // ------------------------------------------
      // Mark helper unavailable when accepted
      // ------------------------------------------
      if (response === "ACCEPTED") {
        await pool.query(
          `UPDATE helpers
           SET available = FALSE
           WHERE id = $1`,
          [helper.id]
        );
      }

      // ------------------------------------------
      // Timeline
      // ------------------------------------------
      await pool.query(
        `INSERT INTO incident_events
        (emergency_id,event_type,description)
        VALUES ($1,$2,$3)`,
        [
          emergency.id,
          "HELPER_RESPONSE",
          `${helper.name} ${response.toLowerCase()} the emergency`
        ]
      );

      res.json({
        message:
          response === "ACCEPTED"
            ? "Helper accepted the emergency 🤝"
            : "Helper declined the emergency",

        helperResponse: {
          id: result.rows[0].id,
          emergencyId: emergency.emergency_code,
          helperId: helper.helper_code,
          helperName: helper.name,
          response,
          status: helperStatus
        }
      });

    } catch (error) {

      console.error(
        "Helper response error:",
        error
      );

      res.status(500).json({
        message: "Failed to process helper response",
        error: error.message
      });
    }
  }
);

// ==========================================
// START SERVER
// ==========================================
async function startServer() {
  try {
    await initDatabase();
  } catch (error) {
    console.error("⚠️ Database initialization warning:", error.message);
  }

  app.listen(PORT, () => {
    console.log(`🚨 Emergency Response Coordinator backend running on port ${PORT}`);
  });
}

startServer();