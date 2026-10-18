"use client";

/**
 * SkeletonGrid (Phase 3 — Data-Bound)
 * --------------------------------------------------------------------
 * A dynamic data grid that subscribes to the Zustand `widgetData` store
 * and reactively renders rows when data arrives for its widget ID.
 *
 * Lifecycle:
 *   1. Mounts with an `id` prop (e.g. "statement_grid_1").
 *   2. Subscribes to `widgetData[id]` via a Zustand selector.
 *   3. Shows an empty-state placeholder until data is pushed.
 *   4. When the Action Dispatcher writes API response data into
 *      `widgetData["statement_grid_1"]`, this component re-renders
 *      with the fresh data.
 *
 * Data shape assumption:
 *   The API response is an array of flat objects (rows). Column headers
 *   are inferred from the keys of the first row. This works for most
 *   banking tabular data (statements, searches, lists). A future
 *   phase can accept explicit `columns[]` from the blueprint.
 *
 * Blueprint contract:
 *   {
 *     "type": "Skeleton_Grid",
 *     "id":   "statement_grid_1",
 *     "props": { "title": "Search Results" }
 *   }
 *
 * Safety:
 *   - Non-array data is coerced to []. Never crashes.
 *   - Empty data renders an empty-state message.
 *   - Missing/null cell values render as "—" (em-dash).
 *   - Extremely long values are truncated via CSS.
 */

import useSduiStore from "@/store/useSduiStore";

/**
 * Formats a cell value for display.
 * Handles null, undefined, booleans, numbers, objects, and strings.
 */
function formatCell(value) {
  if (value == null) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return "[Object]";
    }
  }
  return String(value);
}

/**
 * Converts camelCase or snake_case column keys into human-readable headers.
 * e.g. "accountNo" → "Account No", "branch_code" → "Branch Code"
 */
function humanizeHeader(key) {
  if (typeof key !== "string") return "";
  return key
    // Insert space before uppercase letters (camelCase)
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    // Replace underscores/hyphens with spaces
    .replace(/[_-]/g, " ")
    // Capitalize first letter of each word
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function SkeletonGrid({ id, title = "Data Grid" }) {
  // Subscribe to ONLY this widget's data slice.
  // Zustand's selector ensures this component re-renders only when
  // widgetData[id] changes — not on any other store mutation.
  const rawData = useSduiStore((state) => state.widgetData?.[id] ?? null);

  // Coerce to array — handles object responses by wrapping in array,
  // and non-array/non-object responses by falling back to empty.
  const rows = Array.isArray(rawData)
    ? rawData
    : rawData && typeof rawData === "object"
    ? [rawData]
    : [];

  // Infer column headers from the first row's keys.
  const columns =
    rows.length > 0 && typeof rows[0] === "object"
      ? Object.keys(rows[0])
      : [];

  return (
    <section className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {rows.length > 0 && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            {rows.length} {rows.length === 1 ? "record" : "records"}
          </span>
        )}
      </header>

      {/* ─── Empty State ────────────────────────────────────────── */}
      {rows.length === 0 ? (
        <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
          <svg
            className="mb-3 h-10 w-10 text-slate-300"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M3.75 9.776c.112-.017.227-.026.344-.026h15.812c.117 0
                 .232.009.344.026m-16.5 0a2.25 2.25 0 00-1.883
                 2.542l.857 6a2.25 2.25 0 002.227
                 1.932H19.05a2.25 2.25 0 002.227-1.932l.857-6a2.25
                 2.25 0 00-1.883-2.542m-16.5
                 0V6A2.25 2.25 0 016 3.75h3.879a1.5
                 1.5 0 011.06.44l2.122 2.12a1.5 1.5
                 0 001.06.44H18A2.25 2.25 0 0120.25
                 9v.776"
            />
          </svg>
          <p className="text-sm font-medium text-slate-500">No data to display</p>
          <p className="mt-1 text-xs text-slate-400">
            Submit a search above to populate this grid.
          </p>
        </div>
      ) : (
        /* ─── Data Table ──────────────────────────────────────── */
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50">
                <th className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 w-12">
                  #
                </th>
                {columns.map((col) => (
                  <th
                    key={col}
                    className="px-4 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500"
                  >
                    {humanizeHeader(col)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((row, rowIdx) => (
                <tr
                  key={row?.id ?? `row_${rowIdx}`}
                  className="transition hover:bg-slate-50"
                >
                  <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                    {rowIdx + 1}
                  </td>
                  {columns.map((col) => (
                    <td
                      key={`${rowIdx}_${col}`}
                      className="max-w-[240px] truncate whitespace-nowrap px-4 py-3 text-slate-700"
                      title={formatCell(row?.[col])}
                    >
                      {formatCell(row?.[col])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
