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
    pageTitle: "Fund Transfer Portal",
    layoutType: "VERTICAL_STACK",
    components: [
      {
        type: "Skeleton_Card",
        id: "transfer_alert",
        props: {
          title: "Notice",
          content: "Daily inter-bank settlement limit is $50,000.00. Real-time domestic wire active.",
        },
      },
      {
        type: "Skeleton_Form",
        id: "transfer_form_1",
        props: {
          title: "Transfer Initiation",
          fields: [
            { name: "sourceAccount", label: "Source Account", inputType: "text", required: true, placeholder: "Source account number" },
            { name: "destAccount", label: "Beneficiary Account", inputType: "text", required: true, placeholder: "Recipient account number" },
            { name: "amount", label: "Amount (USD)", inputType: "number", required: true, placeholder: "0.00" },
          ],
          actionId: 102,
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
