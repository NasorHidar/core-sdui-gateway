/**
 * actionDispatcher
 * --------------------------------------------------------------------
 * Central Action Dispatcher for the SDUI engine.
 *
 * The SDUI blueprint associates each form with an `actionId`. When a
 * form submits, the dispatcher:
 *   1. Resolves the actionId → PAGE_ACTION metadata
 *      (endpoint, HTTP method, target widget).
 *   2. Executes the API call with the form payload.
 *   3. On success, writes the response data into the Zustand widgetData
 *      store under the `targetWidget` key — which causes any widget
 *      subscribed to that key (e.g. SkeletonGrid) to reactively update.
 *
 * Mock vs. Live:
 *   Action metadata is currently resolved from a local mock map. When
 *   the Phase 1 backend is reachable, replace `resolveActionMetadata`
 *   with a real `fetch(…)` call to the backend's action endpoint.
 *
 * Error isolation:
 *   Failures never propagate unhandled. Every error path updates the
 *   Zustand actionStates so the UI can render contextual feedback.
 */

import useSduiStore from "@/store/useSduiStore";
import useAppStore from "@/store/useAppStore";

// ─── Mock Action Metadata ──────────────────────────────────────────────
// Simulates the PAGE_ACTION table rows fetched from
// GET /sdui-forge/api/v1/pages/{pageId}/blueprint → actions[]
// Replace with a real fetch when backend is wired.

const ACTION_REGISTRY = {
  101: {
    actionId: 101,
    actionType: "SEARCH_API",
    httpMethod: "POST",
    targetEndpoint: "/api/v1/core/accounts/search",
    targetWidget: "statement_grid_1",
  },
  102: {
    actionId: 102,
    actionType: "SUBMIT_API",
    httpMethod: "POST",
    targetEndpoint: "/api/v1/core/transfers/execute",
    targetWidget: null, // No auto-populate — success notification only
  },
  104: {
    actionId: 104,
    actionType: "SUBMIT_API",
    httpMethod: "POST",
    targetEndpoint: "/api/v1/core/cards/preferences",
    targetWidget: null,
  },
  105: {
    actionId: 105,
    actionType: "SUBMIT_API",
    httpMethod: "POST",
    targetEndpoint: "/api/v1/core/loans/calculate",
    targetWidget: null,
  },
};

/**
 * Resolves action metadata by ID.
 * In production, this would fetch from the backend or pull from the
 * blueprint's `actions[]` array that was loaded at page mount.
 *
 * @param {number|string} actionId
 * @returns {Promise<Object|null>} The action metadata or null.
 */
async function resolveActionMetadata(actionId) {
  // Simulate async resolve (replace with fetch in production)
  const meta = ACTION_REGISTRY[actionId] ?? null;
  if (!meta) {
    console.warn(`[ActionDispatcher] No metadata found for actionId: ${actionId}`);
  }
  return meta;
}

/**
 * Builds the fetch `RequestInit` from action metadata and payload.
 *
 * - GET  → payload goes into query params (not body).
 * - POST/PUT/PATCH → payload is JSON-serialized into the request body.
 * - DELETE → no body.
 *
 * @param {Object} meta    - The PAGE_ACTION metadata.
 * @param {Object} payload - Form data / request payload.
 * @returns {{ url: string, init: RequestInit }}
 */
function buildRequest(meta, payload) {
  const method = (meta?.httpMethod ?? "GET").toUpperCase();
  const baseUrl = meta?.targetEndpoint ?? "/";

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  const jwtToken = useAppStore.getState().jwtToken;
  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  if (method === "GET" || method === "HEAD") {
    // Append payload as query params
    const qs = new URLSearchParams(
      Object.entries(payload ?? {}).reduce((acc, [k, v]) => {
        if (v != null && v !== "") acc[k] = String(v);
        return acc;
      }, {})
    ).toString();
    const url = qs ? `${baseUrl}?${qs}` : baseUrl;
    return { url, init: { method, headers } };
  }

  return {
    url: baseUrl,
    init: {
      method,
      headers,
      body: JSON.stringify(payload ?? {}),
    },
  };
}

/**
 * Executes a dynamic action.
 *
 * This is the single entry point called by SkeletonForm (and any
 * future action trigger). The full lifecycle is:
 *   1. Set action state → loading
 *   2. Resolve metadata
 *   3. Execute fetch
 *   4. Parse response
 *   5. Push data into widgetData[targetWidget]
 *   6. Set action state → done or error
 *
 * @param {number|string} actionId - The PAGE_ACTION.ACT_ID to execute.
 * @param {Object}        payload  - Key-value form data.
 * @returns {Promise<{ success: boolean, data?: any, error?: string }>}
 */
export async function executeDynamicAction(actionId, payload) {
  const { setActionState, setWidgetData } = useSduiStore.getState();

  // 1. Enter loading state
  setActionState(actionId, { loading: true, error: null });

  try {
    // 2. Resolve action metadata
    const meta = await resolveActionMetadata(actionId);
    if (!meta) {
      const msg = `Action configuration not found for actionId: ${actionId}`;
      setActionState(actionId, { loading: false, error: msg });
      return { success: false, error: msg };
    }

    // 3. Build and execute the request
    const { url, init } = buildRequest(meta, payload);

    console.info(
      `[ActionDispatcher] ${init.method} ${url} → targetWidget: ${meta.targetWidget ?? "(none)"}`
    );

    const response = await fetch(url, init);

    // 4. Handle HTTP errors
    if (!response.ok) {
      const errorBody = await response.text().catch(() => "");
      const msg = `API call failed: ${response.status} ${response.statusText}${
        errorBody ? ` — ${errorBody.slice(0, 200)}` : ""
      }`;
      console.error(`[ActionDispatcher] ${msg}`);
      setActionState(actionId, { loading: false, error: msg });
      return { success: false, error: msg };
    }

    // 5. Parse response body
    let data = null;
    const contentType = response.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) {
      data = await response.json();
    } else {
      data = await response.text();
    }

    // 6. Push data into the target widget's store slot
    if (meta.targetWidget) {
      setWidgetData(meta.targetWidget, data);
      console.info(
        `[ActionDispatcher] widgetData["${meta.targetWidget}"] updated with response`
      );
    }

    setActionState(actionId, { loading: false, error: null });
    return { success: true, data };
  } catch (err) {
    // Network failure, JSON parse error, or unexpected exception.
    // Never let it propagate — always surface through the store.
    const msg =
      err?.message ?? "An unexpected error occurred while executing the action.";
    console.error(`[ActionDispatcher] Unhandled error for actionId ${actionId}:`, err);
    setActionState(actionId, { loading: false, error: msg });
    return { success: false, error: msg };
  }
}

/**
 * Generic Dynamic Business Action Submitter
 * --------------------------------------------------------------------
 * Executes dynamic API calls driven 100% by runtime JSON actionMetadata
 * ({ endpoint, method }) without hardcoded paths or static endpoints.
 *
 * @param {Object} actionMetadata - { endpoint: string, method?: string }
 * @param {Object} formData       - Raw form dictionary from react-hook-form.
 * @returns {Promise<{ success: boolean, data?: any, error?: string, status?: number }>}
 */
export async function dispatchDynamicAction(actionMetadata, formData = {}) {
  if (!actionMetadata || !actionMetadata.endpoint) {
    const errorMsg = "[ActionDispatcher] Invalid actionMetadata: 'endpoint' is required.";
    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }

  const method = (actionMetadata.method || "POST").toUpperCase();
  const endpoint = actionMetadata.endpoint;

  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
  };

  // Dynamically attach session JWT bearer token if user is authenticated
  const jwtToken = useAppStore.getState?.()?.jwtToken;
  if (jwtToken) {
    headers["Authorization"] = `Bearer ${jwtToken}`;
  }

  let url = endpoint;
  const requestInit = {
    method,
    headers,
  };

  if (method === "GET" || method === "HEAD") {
    const queryParams = new URLSearchParams(
      Object.entries(formData || {}).reduce((acc, [k, v]) => {
        if (v !== undefined && v !== null && v !== "") {
          acc[k] = String(v);
        }
        return acc;
      }, {})
    ).toString();

    if (queryParams) {
      url = `${endpoint}${endpoint.includes("?") ? "&" : "?"}${queryParams}`;
    }
  } else {
    requestInit.body = JSON.stringify(formData || {});
  }

  console.info(`[ActionDispatcher] Executing dynamic action: ${method} ${url}`);

  try {
    const response = await fetch(url, requestInit);

    let responseData = null;
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      responseData = await response.text();
    }

    if (!response.ok) {
      const errorMsg =
        (responseData && typeof responseData === "object" && (responseData.message || responseData.error)) ||
        `HTTP Error ${response.status}: ${response.statusText}`;
      console.warn(`[ActionDispatcher] Request failed (${response.status}):`, errorMsg);
      return { success: false, error: errorMsg, status: response.status, data: responseData };
    }

    return { success: true, data: responseData, status: response.status };
  } catch (err) {
    const errorMsg =
      err?.message || "Network error: unable to connect to core banking service.";
    console.error("[ActionDispatcher] Network/execution exception:", err);
    return { success: false, error: errorMsg };
  }
}

