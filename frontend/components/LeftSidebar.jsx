"use client";

import useAppStore from "@/store/useAppStore";

/**
 * LeftSidebar
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the sub-service navigation menu for the currently selected main service.
 *
 * Behavior:
 *   - Reads `selectedService.children` (sub-services) from the Zustand store.
 *   - Highlights the active `selectedSubService`.
 *   - Clicking a sub-service calls `selectSubService()` which triggers the
 *     SearchPromptBox in the main content area.
 *   - A "Back to Services" button at the top resets to the service grid.
 */
export default function LeftSidebar() {
  const selectedService = useAppStore((s) => s.selectedService);
  const selectedSubService = useAppStore((s) => s.selectedSubService);
  const selectSubService = useAppStore((s) => s.selectSubService);
  const goHome = useAppStore((s) => s.goHome);

  if (!selectedService) return null;

  const subServices = selectedService.children || [];

  return (
    <nav className="flex h-full flex-col" aria-label="Sub-service navigation">
      {/* Service header */}
      <div className="border-b border-slate-100 px-4 py-4">
        <button
          onClick={goHome}
          className="mb-3 flex items-center gap-1.5 text-xs font-medium text-indigo-600 transition hover:text-indigo-800"
        >
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Services
        </button>
        <h2 className="text-sm font-bold text-slate-900 leading-tight">
          {selectedService.name}
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-400">
          {subServices.length} sub-service{subServices.length !== 1 ? "s" : ""}
        </p>
      </div>

      {/* Sub-service list */}
      <ul className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {subServices.map((sub) => {
          const isActive =
            selectedSubService && selectedSubService.menuId === sub.menuId;

          return (
            <li key={sub.menuId}>
              <button
                onClick={() => selectSubService(sub)}
                className={`
                  group flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-sm transition
                  ${
                    isActive
                      ? "bg-indigo-50 font-semibold text-indigo-700 shadow-sm"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }
                `}
              >
                {/* Active indicator dot */}
                <span
                  className={`h-1.5 w-1.5 shrink-0 rounded-full transition ${
                    isActive
                      ? "bg-indigo-600"
                      : "bg-slate-300 group-hover:bg-slate-400"
                  }`}
                />
                {sub.menuName}
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="border-t border-slate-100 px-4 py-3">
        <p className="text-[10px] text-slate-400">
          Page IDs auto-resolved from SERVICE_DETAILS
        </p>
      </div>
    </nav>
  );
}
