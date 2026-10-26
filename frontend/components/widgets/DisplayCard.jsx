"use client";

import React from "react";

/**
 * Utility helper to convert raw object keys (camelCase, snake_case, etc.)
 * into clean, human-readable Title Case labels without hardcoding.
 *
 * @param {string} key - Raw JSON key (e.g., "accountName", "source_account_id").
 * @returns {string} Human-friendly label (e.g., "Account Name", "Source Account Id").
 */
function formatLabel(key) {
  if (typeof key !== "string" || !key) return "";
  return key
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/[_-]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())
    .trim();
}

/**
 * Formats arbitrary primitive or object values safely.
 *
 * @param {*} value - The raw value from the data map.
 * @returns {string} Renderable text string.
 */
function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") {
    try {
      return JSON.stringify(value);
    } catch {
      return String(value);
    }
  }
  return String(value);
}

/**
 * DisplayCard (SDUI Widget)
 * --------------------------------------------------------------------
 * Strict Access Control Enforcement:
 * Data fetched from the JSON response is rendered strictly as read-only.
 * Displays system-verified banking attributes that cannot be altered by the user.
 *
 * @param {Object} props
 * @param {string} [props.title] - Optional section title.
 * @param {Object} [props.data]  - Key-value dictionary from backend response.
 */
export default function DisplayCard({ title, data = {} }) {
  const safeData = data && typeof data === "object" ? data : {};
  const dataKeys = Object.keys(safeData);

  return (
    <div className="w-full rounded-2xl border border-slate-200/90 bg-gradient-to-b from-slate-50/90 to-slate-100/50 p-5 shadow-sm transition-all hover:border-slate-300">
      {/* Access Control & Header Bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-50 text-indigo-700 text-xs shadow-sm">
            🔒
          </div>
          <h3 className="text-sm font-bold text-slate-800 tracking-tight">
            {title || "System-Verified Information"}
          </h3>
        </div>

        {/* Strict Access Control Indicator */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700 border border-slate-300">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Strict Access Control · Read-Only</span>
        </span>
      </div>

      {dataKeys.length === 0 ? (
        <p className="text-xs italic text-slate-400">
          No system-verified data available to display.
        </p>
      ) : (
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
          {dataKeys.map((key) => {
            const label = formatLabel(key);
            const value = formatValue(safeData?.[key]);

            return (
              <div
                key={key}
                className="group relative flex flex-col justify-center rounded-xl border border-slate-200/80 bg-white p-3.5 shadow-xs transition hover:border-indigo-300"
              >
                <div className="flex items-center justify-between">
                  <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    {label}
                  </dt>
                  <span
                    className="text-[10px] text-slate-400 font-mono"
                    title="Strictly read-only data"
                  >
                    🔒
                  </span>
                </div>
                <dd className="mt-1 text-sm font-semibold text-slate-900 break-words select-text">
                  {value}
                </dd>
              </div>
            );
          })}
        </dl>
      )}

      {/* Access control footnote */}
      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-slate-200/60">
        <span>Backend-Verified Source Data</span>
        <span className="font-mono">STATUS: UNMODIFIABLE</span>
      </div>
    </div>
  );
}
