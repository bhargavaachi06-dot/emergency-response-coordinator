/**
 * Central Safe API Fetch Client
 * Emergency Response Coordinator
 *
 * Guarantees:
 * 1. Never throws "Unexpected token '<', '<!DOCTYPE '... is not valid JSON"
 * 2. Checks content-type before attempting to parse JSON
 * 3. Gracefully handles 404, 500, 502, 503 HTML error pages
 * 4. Logs safe development diagnostics without exposing sensitive tokens/credentials
 * 5. Returns normalized structured objects: { success, status, message, data }
 */

export async function safeApiFetch(url, options = {}) {
  const method = (options.method || "GET").toUpperCase();

  try {
    const res = await fetch(url, options);
    const contentType = (res.headers.get("content-type") || "").toLowerCase();
    const status = res.status;

    // Safe diagnostic log in DEV mode (Never logs credentials, OTPs, or JWTs)
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      try {
        const parsed = new URL(url);
        console.log(`[API Diagnostic] ${method} ${parsed.hostname}${parsed.pathname} [${status} ${contentType.split(";")[0] || "no-content-type"}]`);
      } catch {
        console.log(`[API Diagnostic] ${method} ${url} [${status} ${contentType.split(";")[0] || ""}]`);
      }
    }

    // 1. Handle JSON Responses
    if (contentType.includes("application/json") || contentType.includes("+json")) {
      try {
        const json = await res.json();
        if (res.ok) {
          return {
            success: json.success !== false,
            status,
            ...json,
            data: json,
          };
        } else {
          return {
            success: false,
            status,
            message:
              json.message ||
              json.error ||
              (status >= 500
                ? "The authentication server is temporarily unavailable. Please try again."
                : "Authentication request failed. Please try again."),
            data: json,
          };
        }
      } catch {
        return {
          success: false,
          status,
          message: "The authentication service returned an invalid response. Please try again.",
          data: null,
        };
      }
    }

    // 2. Handle Non-JSON Responses (HTML 404, 502, 503, plain text, etc.)
    const textBody = await res.text();

    if (status === 404) {
      return {
        success: false,
        status: 404,
        isHtml: true,
        message: "The authentication service is not available yet. Please try again shortly.",
        rawSnippet: typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV ? textBody.slice(0, 160) : undefined,
      };
    }

    if (status >= 500) {
      return {
        success: false,
        status,
        isHtml: true,
        message: "The authentication server is temporarily unavailable. Please try again.",
      };
    }

    return {
      success: false,
      status,
      isHtml: true,
      message: "The authentication service returned an unexpected response. Please try again.",
    };
  } catch (error) {
    const rawMsg = (error?.message || String(error || "")).toLowerCase();

    // Safe diagnostic log in DEV mode
    if (typeof import.meta !== "undefined" && import.meta.env && import.meta.env.DEV) {
      try {
        const parsed = new URL(url);
        console.log(`[API Diagnostic] ${method} ${parsed.hostname}${parsed.pathname} [ERR: ${error.message}]`);
      } catch {
        console.log(`[API Diagnostic] ${method} ${url} [ERR: ${error.message}]`);
      }
    }

    if (
      rawMsg.includes("failed to fetch") ||
      rawMsg.includes("networkerror") ||
      rawMsg.includes("load failed") ||
      rawMsg.includes("network request failed") ||
      rawMsg.includes("connection refused")
    ) {
      return {
        success: false,
        status: 0,
        message: "Unable to connect to the emergency response server. Please check your internet connection and try again.",
      };
    }

    if (rawMsg.includes("cors") || rawMsg.includes("cross-origin")) {
      return {
        success: false,
        status: 0,
        message: "Authentication service configuration needs attention.",
      };
    }

    return {
      success: false,
      status: 0,
      message: error?.message || "Unable to connect to the emergency response server. Please check your internet connection and try again.",
    };
  }
}
