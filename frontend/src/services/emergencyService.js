// =====================================================
// Emergency Service — Real API integration
// Connects React frontend to Express.js backend
// =====================================================

import { API_BASE_URL } from "../config/apiConfig";

/**
 * Common API request helper
 */
const apiRequest = async (endpoint, options = {}) => {
  try {
    const token = typeof window !== 'undefined' ? localStorage.getItem("emergency_auth_token") : null;
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
      ...options,
    });

    const contentType = (response.headers.get("content-type") || "").toLowerCase();
    let data = null;

    if (contentType.includes("application/json") || contentType.includes("+json")) {
      try {
        data = await response.json();
      } catch {
        data = null;
      }
    } else {
      await response.text();
    }

    if (!response.ok) {
      return {
        success: false,
        error: data?.message || (response.status >= 500
          ? "The emergency response server is temporarily unavailable."
          : "Unable to process emergency request."),
        data: null,
      };
    }

    return {
      success: true,
      data: data || {},
    };
  } catch (error) {
    console.error("API Error:", error);

    return {
      success: false,
      error:
        "Unable to connect to the emergency response server. Please check your internet connection.",
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
        reportData.location_text ||
        (typeof reportData.location === "string" ? reportData.location : reportData.location?.address) ||
        "",
    };

    // Extended location model — forward all structured address fields if provided
    // Backward-compatible: old consumers only have lat/lng
    const loc = reportData.location;
    if (loc && typeof loc === 'object') {
      if (loc.accuracy !== undefined)      payload.location_accuracy  = loc.accuracy;
      if (loc.street !== undefined)        payload.location_street    = loc.street;
      if (loc.area !== undefined)          payload.location_area      = loc.area;
      if (loc.city !== undefined)          payload.location_city      = loc.city;
      if (loc.district !== undefined)      payload.location_district  = loc.district;
      if (loc.state !== undefined)         payload.location_state     = loc.state;
      if (loc.postalCode !== undefined)    payload.location_postal_code = loc.postalCode;
      if (loc.country !== undefined)       payload.location_country   = loc.country;
      if (loc.formattedAddress !== undefined) payload.location_formatted_address = loc.formattedAddress;
    }

    if (Array.isArray(reportData.media) && reportData.media.length > 0) {
      payload.media = reportData.media;
    }

    return await apiRequest("/emergencies", {
      method: "POST",
      body: JSON.stringify(payload),
    });
  },

  // =====================================================
  // ATTACH EVIDENCE MEDIA (PHOTO / VIDEO)
  // =====================================================

  async uploadMedia(id, mediaList) {
    return await apiRequest(`/emergencies/${id}/media`, {
      method: "POST",
      body: JSON.stringify({ media: Array.isArray(mediaList) ? mediaList : [mediaList] }),
    });
  },

  async getMedia(id) {
    return await apiRequest(`/emergencies/${id}/media`);
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