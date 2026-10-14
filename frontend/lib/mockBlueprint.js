/**
 * mockBlueprint
 * --------------------------------------------------------------------
 * In-memory mock of the Phase-1 backend's
 *   GET /sdui-forge/api/v1/pages/{pageId}/blueprint
 * response. Used by the Next.js server component until the real
 * fetch is wired in.
 *
 * The shape matches the user's authoritative Phase-2 spec
 * (top-level `components` array) AND we expose an extra adapter
 * that maps the live Phase-1 `uiBlueprint.widgets` shape onto it,
 * so the same renderer works against both payloads.
 */

const BLUEPRINTS = {
  101: {
    pageTitle: "Customer Dashboard",
    layoutType: "VERTICAL_STACK",
    components: [
      {
        type: "Skeleton_Card",
        id: "info_card_1",
        props: {
          title: "Account Info",
          content: "Enter details below to view account information.",
        },
      },
      {
        type: "Skeleton_Form",
        id: "search_form_1",
        props: {
          title: "Account Lookup",
          fields: [
            {
              name: "accountNo",
              label: "Account Number",
              inputType: "text",
              required: true,
              placeholder: "e.g. 1234567890",
            },
            {
              name: "branchCode",
              label: "Branch Code",
              inputType: "text",
              required: false,
            },
          ],
          actionId: 101,
        },
      },
    ],
  },
  999: {
    // Deliberately broken entry — used to demo the fallback path.
    pageTitle: "Fallback Demo",
    layoutType: "VERTICAL_STACK",
    components: [
      {
        type: "Skeleton_Card",
        id: "good_card",
        props: { title: "This one is fine", content: "Mapped correctly." },
      },
      {
        type: "Skeleton_Table", // not registered
        id: "missing_widget",
        props: { foo: "bar" },
      },
    ],
  },
};

/**
 * Simulates the network call to the Spring Boot backend.
 * Replace with `fetch(...)` once the API is reachable.
 */
export async function fetchBlueprint(pageId) {
  // Simulated latency so the loading UI is testable.
  // await new Promise((r) => setTimeout(r, 50));

  const key = String(pageId);
  const bp = BLUEPRINTS[key];
  if (!bp) {
    const err = new Error(`PageTemplate not found with identifier: ${pageId}`);
    err.status = 404;
    throw err;
  }
  return bp;
}

/**
 * Adapter: if the payload uses the live Phase-1 shape
 *   { uiBlueprint: { widgets: [...] } }
 * fold it into the renderer's expected
 *   { components: [...] }
 * shape. Pure / no side effects.
 */
export function normalizeBlueprint(raw) {
  if (!raw || typeof raw !== "object") {
    return { pageTitle: "", layoutType: "VERTICAL_STACK", components: [] };
  }
  if (Array.isArray(raw.components)) return raw;

  const widgets = raw?.uiBlueprint?.widgets;
  if (Array.isArray(widgets)) {
    return {
      pageTitle: raw.pageTitle ?? "",
      layoutType: raw.layoutType ?? raw.uiBlueprint?.layout?.type ?? "VERTICAL_STACK",
      components: widgets,
    };
  }

  return { pageTitle: raw.pageTitle ?? "", layoutType: "VERTICAL_STACK", components: [] };
}
