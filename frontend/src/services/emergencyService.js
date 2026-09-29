// =====================================================
// Emergency Service — Real API integration
// Connects React frontend to Express.js backend
// =====================================================

const API_BASE_URL = "http://localhost:5000/api";

/**
 * Common API request helper
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
    });

    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.message || "Something went wrong",
        data: null,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    console.error("API Error:", error);

    return {
      success: false,
      error:
        "Unable to connect to the emergency response server.",
      data: null,
    };
  }
};

export const emergencyService = {

  // =====================================================
  // GET ALL EMERGENCIES
  // =====================================================

  async getAll() {
    return await apiRequest("/emergencies");
  },

  // =====================================================
  // GET SINGLE EMERGENCY
  // =====================================================

  async getById(id) {
    return await apiRequest(`/emergencies/${id}`);
  },

  // =====================================================
  // CREATE EMERGENCY
  // =====================================================

  async submit(reportData) {

    const payload = {
      type: reportData.type,
      description: reportData.description,
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      locationText:
        reportData.locationText ||
        reportData.location ||
        "",
    };

    return await apiRequest("/emergencies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // =====================================================
  // AI ANALYSIS
  // =====================================================

  async analyze(id) {
    return await apiRequest(`/emergencies/${id}/analyze`, {
      method: "POST",
    });
  },

  // =====================================================
  // HINDSIGHT EPISODIC MEMORY CONTEXT
  // =====================================================

  async getMemoryContext(id) {
    return await apiRequest(`/emergencies/${id}/memory-context`);
  },

  async getMemoryHealth() {
    return await apiRequest(`/memory/health`);
  },

  // =====================================================
  // DISPATCH RESPONDERS
  // =====================================================

  async dispatch(id) {
    return await apiRequest(`/emergencies/${id}/dispatch`, {
      method: "POST",
    });
  },

  // =====================================================
  // UPDATE EMERGENCY STATUS
  // =====================================================

  async updateStatus(id, status) {
    return await apiRequest(`/emergencies/${id}/status`, {
      method: "PATCH",
      body: JSON.stringify({
        status,
      }),
    });
  },

  // =====================================================
  // UPDATE RESPONDER STATUS
  // =====================================================

  async updateResponderStatus(
    emergencyId,
    responderName,
    status
  ) {

    return await apiRequest(
      `/emergencies/${emergencyId}/responders/${encodeURIComponent(
        responderName
      )}/status`,
      {
        method: "PATCH",
        body: JSON.stringify({
          status,
        }),
      }
    );
  },

  // =====================================================
  // GET AVAILABLE HELPERS
  // =====================================================

  async getHelpers(id) {
    return await apiRequest(`/emergencies/${id}/helpers`);
  },

  // =====================================================
  // HELPER RESPONSE
  // =====================================================

  async helperRespond(
    emergencyId,
    helperId,
    accepted
  ) {

    return await apiRequest(
      `/emergencies/${emergencyId}/helper-response`,
      {
        method: "POST",
        body: JSON.stringify({
          helperId,
          response: accepted
            ? "ACCEPTED"
            : "DECLINED",
        }),
      }
    );
  },

  // =====================================================
  // NOTIFY HELPERS
  // =====================================================

  async notifyHelpers(emergencyId) {

    // Helper notifications are currently handled
    // through the helper-response/available-helper flow.
    // Keep this method for frontend compatibility.

    const result = await this.getHelpers(emergencyId);

    if (!result.success) {
      return result;
    }

    return {
      success: true,
      data: {
        emergencyId,
        notified: result.data?.length || 0,
        helpers: result.data,
      },
    };
  },

  // =====================================================
  // RESOLVE EMERGENCY
  // =====================================================

  async resolve(id) {

    return await this.updateStatus(
      id,
      "RESOLVED"
    );
  },
};

export default emergencyService;