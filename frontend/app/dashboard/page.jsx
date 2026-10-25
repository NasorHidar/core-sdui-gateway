"use client";

import useAppStore from "@/store/useAppStore";
import ServiceGrid from "@/components/ServiceGrid";
import SearchPromptBox from "@/components/SearchPromptBox";
import SduiRenderer from "@/components/SduiRenderer";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import { normalizeBlueprint } from "@/lib/mockBlueprint";

/**
 * DashboardPage — Main Content Router
 * ─────────────────────────────────────────────────────────────────────────────
 * This single page acts as a conditional renderer based on the Zustand state:
 *
 *   State A: No main service selected  →  Render ServiceGrid
 *   State B: Sub-service selected, no search performed  →  Render SearchPromptBox
 *   State C: Search submitted, blueprint loaded  →  Render SduiRenderer
 *
 * Transitions are driven entirely by the store — no URL routing needed.
 */
export default function DashboardPage() {
  const selectedService = useAppStore((s) => s.selectedService);
  const selectedSubService = useAppStore((s) => s.selectedSubService);
  const fetchedBlueprint = useAppStore((s) => s.fetchedBlueprint);
  const activeSduiPageId = useAppStore((s) => s.activeSduiPageId);
  const searchContext = useAppStore((s) => s.searchContext);
  const selectSubService = useAppStore((s) => s.selectSubService);

  // ── STATE A: No service selected → Service Grid ──────────────────────────
  if (!selectedService) {
    return <ServiceGrid />;
  }

  // ── STATE B: Sub-service selected, no blueprint yet → Search Prompt ──────
  if (selectedSubService && !fetchedBlueprint) {
    return <SearchPromptBox />;
  }

  // ── STATE C: Blueprint loaded → SDUI Renderer ────────────────────────────
  if (fetchedBlueprint && activeSduiPageId) {
    const normalized = normalizeBlueprint(fetchedBlueprint);

    return (
      <div className="mx-auto max-w-5xl">
        {/* Breadcrumb / context bar */}
        <div className="mb-4 flex items-center gap-2 text-xs text-slate-400">
          <button
            onClick={() => selectSubService(selectedSubService)}
            className="hover:text-indigo-600 transition"
          >
            {selectedSubService?.menuName || "Sub-service"}
          </button>
          <span>/</span>
          <span className="font-medium text-slate-600">
            {normalized.pageTitle || `Page #${activeSduiPageId}`}
          </span>
          {searchContext?.searchValue && (
            <>
              <span>·</span>
              <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono text-indigo-600">
                {searchContext.searchValue}
              </span>
            </>
          )}
        </div>

        {/* SDUI Page */}
        <PageErrorBoundary
          pageId={String(activeSduiPageId)}
          pageTitle={normalized.pageTitle}
        >
          <SduiRenderer blueprint={normalized} />
        </PageErrorBoundary>
      </div>
    );
  }

  // ── DEFAULT: Service selected but no sub-service clicked yet ──────────────
  // Show a prompt to select a sub-service from the sidebar
  return (
    <div className="flex h-full items-center justify-center">
      <div className="text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
          {selectedService.icon || "📂"}
        </div>
        <h2 className="text-lg font-bold text-slate-900">
          {selectedService.name}
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Select a sub-service from the left sidebar to continue.
        </p>
      </div>
    </div>
  );
}
