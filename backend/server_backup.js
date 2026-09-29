const express = require("express");
const cors = require("cors");
const pool = require("./db");

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// Temporary demo database
let emergencies = [];
let helpers = [
  {
    id: "H-001",
    name: "Rahul",
    latitude: 17.3900,
    longitude: 78.4800,
    available: true
  },
  {
    id: "H-002",
    name: "Priya",
    latitude: 17.3800,
    longitude: 78.4900,
    available: true
  }
];

let helperResponses = [];

// Home
app.get("/", (req, res) => {
  res.json({
    message: "Emergency Response Coordinator API is running 🚨"
  });
});

// Health
app.get("/api/health", (req, res) => {
  res.json({
    status: "OK",
    service: "Emergency Response Coordinator"
  });
});

// Create emergency
app.post("/api/emergencies", (req, res) => {
  const {
    type,
    description,
    location,
    latitude,
    longitude
  } = req.body;

  if (!type || !description) {
    return res.status(400).json({
      message: "Emergency type and description are required"
    });
  }

  const emergency = {
    id: `ER-${1000 + emergencies.length + 1}`,
    type,
    description,
    location: location || "Unknown",
    latitude: latitude || null,
    longitude: longitude || null,
    severity: "Pending",
    priority: "Pending",
    status: "REPORTED",
    createdAt: new Date().toISOString()
  };

  emergencies.push(emergency);

  res.status(201).json({
    message: "Emergency reported successfully 🚨",
    emergency
  });
});

// Get all emergencies
app.get("/api/emergencies", (req, res) => {
  res.json(emergencies);
});

// Get single emergency
app.get("/api/emergencies/:id", (req, res) => {
  const emergency = emergencies.find(
    (item) => item.id === req.params.id
  );

  if (!emergency) {
    return res.status(404).json({
      message: "Emergency not found"
    });
  }

  res.json(emergency);
});

// AI emergency analysis
app.post("/api/emergencies/:id/analyze", (req, res) => {
  const emergency = emergencies.find(
    (item) => item.id === req.params.id
  );

  if (!emergency) {
    return res.status(404).json({
      message: "Emergency not found"
    });
  }

  const text =
    `${emergency.type} ${emergency.description}`.toLowerCase();

  let analysis;

  if (
    text.includes("accident") ||
    text.includes("collision") ||
    text.includes("crash")
  ) {
    analysis = {
      category: "Road Accident",
      severity: "Critical",
      priority: "HIGH",
      recommendedResponders: ["Ambulance", "Police"],
      confidence: 94
    };
  } else if (
    text.includes("fire") ||
    text.includes("smoke") ||
    text.includes("burning")
  ) {
    analysis = {
      category: "Fire",
      severity: "Critical",
      priority: "HIGH",
      recommendedResponders: ["Fire & Rescue", "Ambulance"],
      confidence: 92
    };
  } else if (
    text.includes("injury") ||
    text.includes("unconscious") ||
    text.includes("medical")
  ) {
    analysis = {
      category: "Medical Emergency",
      severity: "Critical",
      priority: "HIGH",
      recommendedResponders: ["Ambulance"],
      confidence: 91
    };
  } else {
    analysis = {
      category: emergency.type || "Other",
      severity: "Medium",
      priority: "MEDIUM",
      recommendedResponders: ["Emergency Coordinator"],
      confidence: 78
    };
  }

  emergency.aiAnalysis = analysis;
  emergency.severity = analysis.severity;
  emergency.priority = analysis.priority;
  emergency.status = "ANALYZING";

  res.json({
    message: "Emergency analyzed successfully",
    decisionSupport: true,
    analysis
  });
});

// Dispatch responders
app.post("/api/emergencies/:id/dispatch", (req, res) => {
  const emergency = emergencies.find(
    (item) => item.id === req.params.id
  );

  if (!emergency) {
    return res.status(404).json({
      message: "Emergency not found"
    });
  }

  const responders =
    req.body.responders ||
    emergency.aiAnalysis?.recommendedResponders ||
    [];

  if (responders.length === 0) {
    return res.status(400).json({
      message: "No responders selected"
    });
  }

  emergency.responders = responders.map((name) => ({
    name,
    status: "DISPATCHED",
    dispatchedAt: new Date().toISOString()
  }));

  emergency.status = "DISPATCHED";

  res.json({
    message: "Responders dispatched successfully 🚨",
    emergency
  });
});

// Update responder status
app.patch("/api/emergencies/:id/responders/:responderName/status", (req, res) => {
  const emergency = emergencies.find(
    (item) => item.id === req.params.id
  );

  if (!emergency) {
    return res.status(404).json({
      message: "Emergency not found"
    });
  }

  if (!emergency.responders) {
    return res.status(400).json({
      message: "No responders have been dispatched"
    });
  }

  const responder = emergency.responders.find(
    (item) =>
      item.name.toLowerCase() ===
      req.params.responderName.toLowerCase()
  );

  if (!responder) {
    return res.status(404).json({
      message: "Responder not found"
    });
  }

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

  responder.status = status;
  responder.updatedAt = new Date().toISOString();

  res.json({
    message: `${responder.name} status updated successfully`,
    responder
  });
});

// Get available community helpers
app.get("/api/helpers", (req, res) => {
  const availableHelpers = helpers.filter(
    (helper) => helper.available
  );

  res.json(availableHelpers);
});

// Helper responds to an emergency
app.post("/api/emergencies/:id/helper-response", (req, res) => {
  const emergency = emergencies.find(
    (item) => item.id === req.params.id
  );

  if (!emergency) {
    return res.status(404).json({
      message: "Emergency not found"
    });
  }

  const { helperId, response } = req.body;

  const helper = helpers.find(
    (item) => item.id === helperId
  );

  if (!helper) {
    return res.status(404).json({
      message: "Helper not found"
    });
  }

  if (!["ACCEPTED", "DECLINED"].includes(response)) {
    return res.status(400).json({
      message: "Response must be ACCEPTED or DECLINED"
    });
  }

  const helperResponse = {
    id: `HR-${helperResponses.length + 1}`,
    emergencyId: emergency.id,
    helperId: helper.id,
    helperName: helper.name,
    response,
    status: response === "ACCEPTED" ? "ASSISTING" : "DECLINED",
    createdAt: new Date().toISOString()
  };

  helperResponses.push(helperResponse);

  res.json({
    message:
      response === "ACCEPTED"
        ? "Helper accepted the emergency 🤝"
        : "Helper declined the emergency",
    helperResponse
  });
});

app.get("/api/db-test", async (req, res) => {
  try {
    const result = await pool.query("SELECT NOW()");

    res.json({
      status: "OK",
      database: "PostgreSQL connected",
      time: result.rows[0].now,
    });
  } catch (error) {
    res.status(500).json({
      status: "ERROR",
      message: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});

