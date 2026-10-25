"use client";

import { useState } from "react";
import useAppStore from "@/store/useAppStore";

/**
 * SearchPromptBox
 * ─────────────────────────────────────────────────────────────────────────────
 * Displayed when a sub-service is selected but the user hasn't searched yet.
 *
 * Reads the `selectedSubService` from the store to determine:
 *   - Which search field to show (label + placeholder)
 *   - Which pageId to fetch the blueprint for
 *
 * On submit:
 *   1. Calls `fetchBlueprint(pageId, searchContext)` on the store.
 *   2. The store fetches from /api/v1/pages/{pageId}/blueprint with JWT.
 *   3. On success the store sets `fetchedBlueprint`, which the DashboardPage
 *      detects and mounts the SduiRenderer.
 *   4. On 401 the store calls logout() → auth guard redirects to /login.
 */

// Default search field configs per sub-service page. The backend SERVICE_DETAILS
// can include these in future — for now they're hardcoded per seed data.
const SEARCH_CONFIGS = {
  101: { label: "Account Number",        placeholder: "e.g. 100293847",   icon: "🔍" },
  102: { label: "Source Account",         placeholder: "e.g. 100293847",   icon: "💸" },
  103: { label: "Reference / Txn ID",     placeholder: "e.g. TXN-88392019", icon: "📋" },
  104: { label: "Card Number (last 4)",   placeholder: "e.g. 4821",        icon: "💳" },
  105: { label: "Facility ID",            placeholder: "e.g. FAC-001",     icon: "📊" },
  999: { label: "Any Value (Test)",       placeholder: "test",             icon: "🧪" },
};

export default function SearchPromptBox() {
  const selectedSubService = useAppStore((s) => s.selectedSubService);
  const fetchBlueprint = useAppStore((s) => s.fetchBlueprint);
  const blueprintLoading = useAppStore((s) => s.blueprintLoading);
  const blueprintError = useAppStore((s) => s.blueprintError);

  const [searchValue, setSearchValue] = useState("");

  if (!selectedSubService) return null;

  const pageId = selectedSubService.pageId;
  const config = SEARCH_CONFIGS[pageId] || {
    label: selectedSubService.searchLabel || "Search Value",
    placeholder: selectedSubService.searchPlaceholder || "Enter value…",
    icon: "🔍",
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!searchValue.trim()) return;
    await fetchBlueprint(pageId, { searchValue: searchValue.trim() });
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* Context header */}
      <div className="mb-6">
        <p className="text-xs font-medium uppercase tracking-wider text-indigo-600">
          {selectedSubService.menuName}
        </p>
        <h2 className="mt-1 text-xl font-bold text-slate-900">
          Enter Search Criteria
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Provide the required value below to load the dynamic banking page.
        </p>
      </div>

      {/* Search card */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-md">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label
              htmlFor="search-input"
              className="mb-1.5 block text-sm font-medium text-slate-700"
            >
              {config.icon} {config.label}
            </label>
            <input
              id="search-input"
              type="text"
              required
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              placeholder={config.placeholder}
              disabled={blueprintLoading}
              className="w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50"
              autoFocus
            />
          </div>

          {/* Error banner */}
          {blueprintError && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <span className="font-medium">Error:</span> {blueprintError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={blueprintLoading || !searchValue.trim()}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-500/20 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {blueprintLoading ? (
              <>
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Fetching Page Blueprint…
              </>
            ) : (
              <>Load Dynamic Page</>
            )}
          </button>
        </form>

        {/* Metadata hint */}
        <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-400">
          <span className="font-medium text-slate-500">Page ID:</span> {pageId} ·{" "}
          <span className="font-medium text-slate-500">Endpoint:</span>{" "}
          <code className="text-indigo-500">/api/v1/pages/{pageId}/blueprint</code>
        </div>
      </div>
    </div>
  );
}
