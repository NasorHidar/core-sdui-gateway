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
  1: {
    pageTitle: "Customer Dashboard",
    layoutType: "VERTICAL_STACK",
    components: [
      {
        type: "Skeleton_Card",
        id: "info_card_1",
        props: {
          title: "Account Overview",
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
              rules: [
                { type: "required", value: true, message: "Account number is required" },
                { type: "minLength", value: 6, message: "Must be at least 6 digits" },
              ],
            },
            {
              name: "branchCode",
              label: "Branch Code",
              inputType: "text",
              required: false,
              placeholder: "e.g. BR001",
            },
          ],
          actionId: 101,
        },
      },
      {
        type: "Skeleton_Grid",
        id: "statement_grid_1",
        props: { title: "Account Statement" },
      },
    ],
  },
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
              rules: [
                { type: "required", value: true, message: "Account number is required" },
                { type: "minLength", value: 6, message: "Must be at least 6 digits" },
              ],
            },
            {
              name: "branchCode",
              label: "Branch Code",
              inputType: "text",
              required: false,
              placeholder: "e.g. BR001",
            },
          ],
          actionId: 101,
        },
      },
      {
        // Phase 3: data-bound grid. Subscribes to widgetData["statement_grid_1"]
        // which the Action Dispatcher populates on form submit.
        type: "Skeleton_Grid",
        id: "statement_grid_1",
        props: { title: "Account Statement" },
      },
    ],
  },
  102: {
    pageTitle: "Fund Transfer Initiation",
    layoutType: "VERTICAL_STACK",
    widgets: [
      {
        widgetType: "Display_Card",
        props: {
          title: "Source Account Info",
          data: {
            accountName: "Nasor Hidar",
            accountNo: "1029384756",
            balance: "50,000 BDT",
          },
        },
      },
      {
        widgetType: "Input_Group",
        props: {
          title: "Transfer Details",
          fields: [
            {
              name: "targetAccount",
              label: "Destination Account",
              type: "text",
              required: true,
              placeholder: "Enter 10-digit account number",
            },
            {
              name: "transferAmount",
              label: "Amount (BDT)",
              type: "number",
              required: true,
              min: 500,
              placeholder: "Min 500 BDT",
            },
            {
              name: "currency",
              label: "Settlement Currency",
              type: "text",
              readOnly: true,
              defaultValue: "BDT (Bangladeshi Taka)",
            },
          ],
        },
      },
      {
        widgetType: "Action_Button",
        props: {
          label: "Initiate Transfer",
          variant: "primary",
          actionMetadata: {
            endpoint: "/api/v1/core/transfers/execute",
            method: "POST",
          },
        },
      },
    ],
  },
  103: {
    pageTitle: "Transaction History & Audit",
    layoutType: "VERTICAL_STACK",
    components: [
      {
        type: "Skeleton_Card",
        id: "history_summary",
        props: {
          title: "Audit Ledger",
          content: "Showing cleared transactions for active banking session.",
        },
      },
      {
        type: "Skeleton_Grid",
        id: "history_grid_1",
        props: { title: "Cleared Ledger Entries" },
      },
    ],
  },
  104: {
    pageTitle: "Card Controls & Security",
    layoutType: "VERTICAL_STACK",
    components: [
      {
        type: "Skeleton_Card",
        id: "card_spec_card",
        props: {
          title: "Corporate Visa Debit (••• 4821)",
          content: "Status: ACTIVE | Daily POS Limit: $5,000 | Contactless: ENABLED",
        },
      },
      {
        type: "Skeleton_Form",
        id: "card_settings_form",
        props: {
          title: "Security Preferences",
          fields: [
            { name: "cardPin", label: "New ATM PIN (4 digits)", inputType: "password", required: true, placeholder: "••••" },
            { name: "intlUsage", label: "Allow International Transactions (Y/N)", inputType: "text", required: false, placeholder: "Y or N" },
          ],
          actionId: 104,
        },
      },
    ],
  },
  105: {
    pageTitle: "Commercial Lending Inquiry",
    layoutType: "VERTICAL_STACK",
    components: [
      {
        type: "Skeleton_Card",
        id: "rates_notice",
        props: {
          title: "Commercial APR Notice",
          content: "Benchmark Prime Rate + 1.75% applies for term facilities up to 60 months.",
        },
      },
      {
        type: "Skeleton_Form",
        id: "loan_calc_form",
        props: {
          title: "Loan Calculator",
          fields: [
            { name: "facilityAmount", label: "Requested Amount ($)", inputType: "number", required: true, placeholder: "100000" },
            { name: "termMonths", label: "Amortization Term (Months)", inputType: "number", required: true, placeholder: "36" },
          ],
          actionId: 105,
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
 * Fetches the blueprint from the physical JSON file on disk,
 * or falls back to in-memory/API.
 */
export async function fetchBlueprint(pageId) {
  // If in Node server environment (Next.js Server Component or API route), load directly from JSON
  if (typeof window === "undefined") {
    try {
      const { loadBlueprintFromJson } = await import("@/lib/jsonBlueprintLoader");
      const result = await loadBlueprintFromJson(pageId);
      return result.blueprint;
    } catch (e) {
      // If error specifically says not found and we have fallback in memory, check BLUEPRINTS
      const key = String(pageId).replace(/\.json$/i, "");
      if (BLUEPRINTS[key]) {
        return BLUEPRINTS[key];
      }
      throw e;
    }
  }

  // Client-side execution: fetch from API endpoint
  try {
    const res = await fetch(`/api/blueprints/${pageId}`);
    if (res.ok) {
      return await res.json();
    }
  } catch (err) {
    // ignore and check local map
  }

  const key = String(pageId).replace(/\.json$/i, "");
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
    return { pageTitle: "", layoutType: "VERTICAL_STACK", components: [], widgets: [], actions: [] };
  }

  const actions = raw.actions || raw.pageActions || raw.uiBlueprint?.actions || [];

  if (Array.isArray(raw.widgets)) {
    return {
      ...raw,
      components: raw.components || raw.widgets,
      widgets: raw.widgets,
      actions: raw.actions || actions,
    };
  }
  if (Array.isArray(raw.components)) {
    return {
      ...raw,
      components: raw.components,
      widgets: raw.widgets || raw.components,
      actions: raw.actions || actions,
    };
  }

  const widgets = raw?.uiBlueprint?.widgets;
  if (Array.isArray(widgets)) {
    return {
      pageId: raw.pageId,
      pageTitle: raw.pageTitle ?? "",
      layoutType: raw.layoutType ?? raw.uiBlueprint?.layout?.type ?? "VERTICAL_STACK",
      components: widgets,
      widgets: widgets,
      actions: actions,
      uiBlueprint: raw.uiBlueprint,
    };
  }

  return {
    pageId: raw.pageId,
    pageTitle: raw.pageTitle ?? "",
    layoutType: "VERTICAL_STACK",
    components: [],
    widgets: [],
    actions: actions,
  };
}
