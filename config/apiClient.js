import BASE_URL from "./api";
import { supabase } from "./supabase";

/**
 * API Client. The session token is attached BY DEFAULT — the backend
 * authenticates every business route. (The old "opt-in auth" flag was never
 * passed by a single call site, so the entire app called the API anonymously;
 * audit WF-002.) Pass { useAuth: false } only for genuinely public endpoints.
 */

export async function apiRequest(endpoint, method = "GET", body = null, options = {}) {
  try {
    const isFormData = body instanceof FormData;
    let headers = {
      ...options.headers,
    };
    
    if (!isFormData) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    } else {
      delete headers["Content-Type"];
    }

    if (options.useAuth !== false) {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.access_token) {
          headers["Authorization"] = `Bearer ${session.access_token}`;
        }
      } catch (authError) {
        if (__DEV__) console.log("Auth token fetch error:", authError);
      }
    }

    const fullUrl = `${BASE_URL}${endpoint}`;
    // Request/response logging is dev-only: bodies carry member PII.
    if (__DEV__) {
      console.log(`🌐 API ${method} ${fullUrl}`);
    }

    let response;
    try {
      response = await fetch(fullUrl, {
        method,
        headers,
        body: isFormData ? body : (body ? JSON.stringify(body) : null),
      });
    } catch (fetchError) {
      console.error("❌ Fetch Error Details:", {
        name: fetchError.name,
        message: fetchError.message,
        stack: fetchError.stack,
        url: fullUrl
      });

      // Provide more helpful error message
      if (fetchError.message === "Failed to fetch" || fetchError.name === "TypeError") {
        throw new Error(
          `Network error: Could not connect to ${fullUrl}. ` +
          `Please check:\n` +
          `1. Backend is running on port 8000\n` +
          `2. Backend URL is correct: ${BASE_URL}\n` +
          `3. No firewall blocking the connection`
        );
      }
      throw fetchError;
    }

    if (__DEV__) console.log(`📊 ${response.status} ${method} ${endpoint}`);

    // Handle non-OK responses
    if (!response.ok) {
      const contentType = response.headers.get("content-type");
      let errorMessage;

      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        if (response.status === 422 && errorData.detail) {
          // Flatten FastAPI validation errors: "field: error"
          errorMessage = Array.isArray(errorData.detail)
            ? errorData.detail.map(err => `${err.loc.join('.')}: ${err.msg}`).join(', ')
            : JSON.stringify(errorData.detail);
        } else {
          errorMessage = errorData.detail || errorData.message || `HTTP ${response.status}`;
          if (typeof errorMessage === 'object') errorMessage = JSON.stringify(errorMessage);
        }
      } else {
        const errorText = await response.text();
        errorMessage = errorText || `HTTP ${response.status}: ${response.statusText}`;
      }

      throw new Error(errorMessage);
    }

    // Handle successful responses
    const contentType = response.headers.get("content-type");

    // If no content-type or not JSON, try to read as text first
    if (!contentType || !contentType.includes("application/json")) {
      // For 204 No Content, return null
      if (response.status === 204) {
        if (__DEV__) console.log(`✅ 204 ${endpoint}`);
        return null;
      }

      // Try to read as text and parse if possible
      const text = await response.text();
      if (!text || text.trim() === "") {
        if (__DEV__) console.log(`✅ empty ${endpoint}`);
        return null;
      }

      // Try to parse as JSON even if content-type doesn't say so
      try {
        const data = JSON.parse(text);
        return data;
      } catch {
        // Not JSON, return text

        return text;
      }
    }

    // Content-type is JSON, parse it
    try {
      const data = await response.json();
      return data;
    } catch (parseError) {
      console.error("❌ JSON Parse Error:", parseError);
      throw new Error("Failed to parse response as JSON");
    }
  } catch (err) {
    console.error("❌ API Error:", err);
    // Check if it's a network error
    if (err.message === "Failed to fetch" || err.name === "TypeError") {
      throw new Error("Network error: Could not connect to server. Please check if the backend is running.");
    }
    throw err;
  }
}

/**
 * Helper HTTP wrappers
 */
export const api = {
  get: (endpoint, options = {}) => apiRequest(endpoint, "GET", null, options),
  post: (endpoint, body, options = {}) => apiRequest(endpoint, "POST", body, options),
  put: (endpoint, body, options = {}) => apiRequest(endpoint, "PUT", body, options),
  delete: (endpoint, options = {}) => apiRequest(endpoint, "DELETE", null, options),
  patch: (endpoint, body, options = {}) => apiRequest(endpoint, "PATCH", body, options),
};
