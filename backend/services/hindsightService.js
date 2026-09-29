// ============================================================
// Hindsight Episodic Memory Service — Emergency Response Coordinator
// ============================================================
// Provides genuine episodic memory for emergency AI triage and dispatch:
//   1. Retain meaningful incident lifecycle events (analysis, dispatch, overrides, arrival, resolution)
//   2. Recall relevant historical/active context (scene constraints, road blocks, past coordinator decisions)
//   3. Fail-safe by design: Never throws 500 errors; continues gracefully if Hindsight is unavailable.
// ============================================================

require("dotenv").config();

const { HindsightClient, recallResponseToPromptString } = require("@vectorize-io/hindsight-client");

const DEFAULT_BANK_ID = "emergency-response-coordinator";
const DEFAULT_TIMEOUT_MS = 3500;

// ------------------------------------------------------------
// SENSITIVE DATA SANITIZER
// ------------------------------------------------------------

function sanitizeMemoryContent(text) {
  if (!text || typeof text !== "string") return "";

  let sanitized = text;

  // Mask phone numbers (10 digits, formatted or unformatted)
  sanitized = sanitized.replace(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g, "[PHONE_REDACTED]");

  // Mask emails
  sanitized = sanitized.replace(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, "[EMAIL_REDACTED]");

  // Mask database URLs or credentials if accidentally present
  sanitized = sanitized.replace(/postgres(?:ql)?:\/\/[^\s]+/gi, "[DATABASE_URL_REDACTED]");

  // Mask potential API keys or tokens (alphanumeric sequences >= 30 chars)
  sanitized = sanitized.replace(/\b[A-Za-z0-9_-]{32,}\b/g, "[TOKEN_REDACTED]");

  return sanitized.trim();
}

// ------------------------------------------------------------
// CONFIGURATION & CLIENT INSTANTIATION
// ------------------------------------------------------------

function getBankId() {
  return process.env.HINDSIGHT_BANK_ID || DEFAULT_BANK_ID;
}

function getApiUrl() {
  return process.env.HINDSIGHT_API_URL || "https://api.hindsight.vectorize.io";
}

function isHindsightConfigured() {
  const key = process.env.HINDSIGHT_API_KEY;
  return Boolean(
    key &&
    key.trim().length > 5 &&
    key !== "YOUR_HINDSIGHT_API_KEY_HERE" &&
    !key.includes("placeholder")
  );
}

let cachedClient = null;

function getClient() {
  if (!isHindsightConfigured()) {
    return null;
  }

  if (!cachedClient) {
    const baseUrl = getApiUrl();
    const apiKey = process.env.HINDSIGHT_API_KEY;

    cachedClient = new HindsightClient({
      baseUrl,
      apiKey,
    });
  }

  return cachedClient;
}

// ------------------------------------------------------------
// TIMEOUT HELPER (Guarantees Fail-Safe Execution)
// ------------------------------------------------------------

function withTimeout(promise, ms = DEFAULT_TIMEOUT_MS, operationName = "Hindsight operation") {
  let timeoutId;
  const timeoutPromise = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`${operationName} timed out after ${ms}ms`));
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timeoutId);
  });
}

// ------------------------------------------------------------
// HEALTH CHECK
// ------------------------------------------------------------

async function healthCheck() {
  const configured = isHindsightConfigured();
  const bankId = getBankId();

  if (!configured) {
    return {
      configured: false,
      available: false,
      bankId,
      message: "HINDSIGHT_API_KEY is not configured in environment.",
    };
  }

  const client = getClient();
  if (!client) {
    return {
      configured: false,
      available: false,
      bankId,
      message: "Unable to instantiate Hindsight client.",
    };
  }

  try {
    const versionInfo = await withTimeout(client.getVersion(), DEFAULT_TIMEOUT_MS, "Health check");
    return {
      configured: true,
      available: true,
      bankId,
      apiVersion: versionInfo.api_version,
      features: versionInfo.features,
    };
  } catch (err) {
    console.warn(`[Hindsight] Health check failed: ${err.message}`);
    return {
      configured: true,
      available: false,
      bankId,
      message: `Hindsight service unreachable: ${err.message}`,
    };
  }
}

// ------------------------------------------------------------
// RETAIN EMERGENCY MEMORY
// ------------------------------------------------------------

/**
 * Retains meaningful emergency events into Hindsight memory.
 *
 * @param {object} incident - Emergency data
 * @param {string} eventType - ANALYZED | DISPATCHED | COORDINATOR_OVERRIDE | ARRIVED | RESOLVED
 * @param {object} extraData - Optional additional context
 * @returns {Promise<{success: boolean, available: boolean, memory?: string, error?: string}>}
 */
async function retainEmergencyMemory(incident, eventType, extraData = {}) {
  if (!incident) {
    return { success: false, available: false, error: "No incident provided" };
  }

  if (!isHindsightConfigured()) {
    return {
      success: false,
      available: false,
      error: "Hindsight not configured",
    };
  }

  const client = getClient();
  const bankId = getBankId();

  const code = incident.emergency_code || incident.emergencyCode || (incident.id ? `ER-${incident.id}` : "UNKNOWN");
  const type = incident.type || incident.category || "Emergency";
  const location = incident.location_text || incident.locationText || "Incident Scene";
  const desc = sanitizeMemoryContent(incident.description || "");

  let contentText = "";

  switch (eventType) {
    case "ANALYZED": {
      const category = extraData.category || incident.category || type;
      const severity = extraData.severity || incident.severity || "Moderate";
      const priority = extraData.priority || incident.priority || "MEDIUM";
      const responders = Array.isArray(extraData.recommendedResponders)
        ? extraData.recommendedResponders.join(", ")
        : "Emergency Coordinator";
      const signals = Array.isArray(extraData.keySignals)
        ? extraData.keySignals.join("; ")
        : "";
      const source = extraData.source || "AI";

      contentText = `Emergency ${code} was analyzed (${source}). Category: ${category}. Severity: ${severity}. Priority: ${priority}. Location: ${location}. Key signals detected: [${signals}]. Recommended responders: ${responders}. Incident details: "${desc}".`;
      break;
    }

    case "DISPATCHED": {
      const dispatched = Array.isArray(extraData.responders)
        ? extraData.responders.map((r) => (typeof r === "string" ? r : r.name || r.type)).join(", ")
        : "Emergency Responders";
      contentText = `Emergency ${code} dispatch order confirmed. Responders dispatched: ${dispatched} to ${location}. Time: ${new Date().toISOString()}. Initial report: "${desc}".`;
      break;
    }

    case "COORDINATOR_OVERRIDE": {
      const orig = extraData.originalRecommendation || "Standard Dispatch";
      const decision = extraData.coordinatorDecision || "Manual Reassignment";
      const reason = extraData.reason ? ` Reason: ${extraData.reason}.` : "";
      contentText = `Emergency ${code} at ${location}: Coordinator overrode recommendation. Initial: ${orig}. Coordinator decision: ${decision}.${reason}`;
      break;
    }

    case "ARRIVED": {
      const responder = extraData.responderName || "First responder";
      contentText = `Emergency ${code} update: ${responder} arrived on scene at ${location}. Operational status: scene secured / responders arrived.`;
      break;
    }

    case "RESOLVED": {
      const outcome = extraData.outcome || "Incident successfully handled and cleared";
      contentText = `Emergency ${code} at ${location} has been RESOLVED. Final outcome: ${outcome}. Incident type: ${type}.`;
      break;
    }

    default: {
      contentText = `Emergency ${code} (${type}) at ${location}: ${desc}`;
    }
  }

  const sanitizedContent = sanitizeMemoryContent(contentText);

  try {
    console.log(`[Hindsight] Retaining memory for ${code} (${eventType})...`);

    const retainOptions = {
      context: `Emergency event: ${eventType} for ${code} in ${location}`,
      metadata: {
        emergency_code: String(code),
        event_type: String(eventType),
        category: String(type),
        priority: String(incident.priority || "MEDIUM"),
        timestamp: new Date().toISOString(),
      },
      tags: ["emergency", eventType.toLowerCase(), type.toLowerCase().replace(/[^a-z0-9]/g, "-")],
    };

    await withTimeout(
      client.retain(bankId, sanitizedContent, retainOptions),
      DEFAULT_TIMEOUT_MS,
      `Retain (${eventType})`
    );

    console.log(`🧠 Hindsight retain successful for ${code} (${eventType})`);
    return {
      success: true,
      available: true,
      memory: sanitizedContent,
    };
  } catch (err) {
    console.warn(`⚠️ Hindsight retain unavailable (${err.message}) — continuing without memory persistence`);
    return {
      success: false,
      available: false,
      error: err.message,
    };
  }
}

// ------------------------------------------------------------
// RECALL EMERGENCY MEMORY
// ------------------------------------------------------------

/**
 * Recalls relevant historical and active incident context from Hindsight.
 *
 * @param {object} incident - Emergency data
 * @returns {Promise<{success: boolean, available: boolean, memoryCount: number, memories: string[], contextText: string}>}
 */
async function recallEmergencyMemory(incident) {
  if (!incident) {
    return {
      success: false,
      available: false,
      memoryCount: 0,
      memories: [],
      contextText: "",
    };
  }

  if (!isHindsightConfigured()) {
    console.log("[Hindsight] Not configured — skipping recall.");
    return {
      success: false,
      available: false,
      memoryCount: 0,
      memories: [],
      contextText: "",
    };
  }

  const client = getClient();
  const bankId = getBankId();

  const type = incident.type || incident.category || "emergency";
  const location = incident.location_text || incident.locationText || "local area";
  const desc = incident.description || "";

  // Formulate a focused, relevant query based on incident parameters
  const query = `Find relevant active and historical emergency incidents near ${location} involving ${type}, road blockages, responder activity, recurring hazards, coordinator decisions, and similar incidents. Context: ${desc.slice(0, 160)}`;

  try {
    console.log(`🧠 Hindsight recall started for incident near "${location}"...`);

    const recallPromise = client.recall(bankId, query, {
      maxTokens: 600,
    });

    const response = await withTimeout(recallPromise, DEFAULT_TIMEOUT_MS, "Recall");

    // Extract textual memories
    const memories = [];
    if (Array.isArray(response?.results)) {
      for (const item of response.results) {
        if (item && typeof item.text === "string" && item.text.trim()) {
          memories.push(item.text.trim());
        }
      }
    }

    let contextText = "";
    if (memories.length > 0) {
      contextText = memories.map((m, i) => `[Historical Incident ${i + 1}]: ${m}`).join("\n");
      console.log(`🧠 Hindsight recall returned ${memories.length} memories`);
    } else {
      console.log("[Hindsight] Recall returned 0 relevant memories.");
    }

    return {
      success: true,
      available: true,
      memoryCount: memories.length,
      memories,
      contextText,
      rawResponse: response,
    };
  } catch (err) {
    console.warn(`⚠️ Hindsight recall unavailable (${err.message}) — continuing without memory`);
    return {
      success: false,
      available: false,
      memoryCount: 0,
      memories: [],
      contextText: "",
      error: err.message,
    };
  }
}

// ------------------------------------------------------------
// GET MEMORY CONTEXT HELPER
// ------------------------------------------------------------

async function getMemoryContext(incident) {
  const result = await recallEmergencyMemory(incident);
  return {
    available: result.available,
    memoryCount: result.memoryCount,
    memories: result.memories,
    contextText: result.contextText,
  };
}

module.exports = {
  isHindsightConfigured,
  healthCheck,
  retainEmergencyMemory,
  recallEmergencyMemory,
  getMemoryContext,
  sanitizeMemoryContent,
  getBankId,
};
