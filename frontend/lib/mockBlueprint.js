/**
 * mockBlueprint (Phase 3 — Updated)
 * --------------------------------------------------------------------
 * In-memory mock of the Phase-1 backend's
 *   GET /sdui-forge/api/v1/pages/{pageId}/blueprint
 * response. Used by the Next.js server component until the real
 * fetch is wired in.
 *
 * Phase 3 changes:
 *   - Fields now include `rules` objects for dynamic validation.
 *   - Added Skeleton_Grid component to demo data binding.
 *   - Page 101 models a full search → grid flow.
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
          content: "Enter details below to search for account statements.",
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
              placeholder: "e.g. 1234567890123",
              rules: {
                required: true,
                minLength: 13,
                pattern: "^\\d+$",
                patternMessage: "Account number must contain only digits",
              },
            },
            {
              name: "branchCode",
              label: "Branch Code",
              inputType: "text",
              placeholder: "e.g. BR001",
              rules: {
                required: false,
                maxLength: 10,
              },
            },
          ],
          actionId: 101,
        },
      },
      {
        type: "Skeleton_Grid",
        id: "statement_grid_1",
        props: {
          title: "Account Statements",
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
