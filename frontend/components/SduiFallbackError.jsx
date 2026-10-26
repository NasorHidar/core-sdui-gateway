"use client";

import React, { useState } from "react";
import useAppStore from "@/store/useAppStore";

/**
 * SduiFallbackError — Enterprise Predefined Error/Fallback Component
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders gracefully when:
 *   1. The backend fails to deliver the JSON blueprint (HTTP 500/503/404).
 *   2. An API timeout occurs while contacting the Core Banking Gateway (HTTP 504).
 *   3. Network connectivity is interrupted during microservice downtimes.
 *
 * Guarantees ZERO BLANK SCREENS. Provides intuitive recovery paths:
 *   - "Retry Blueprint Load" (re-attempts delivery with visual feedback)
 *   - "Navigate Back" (returns to search box or sub-service menu)
 *   - "Return to Dashboard" (navigates back to main service grid)
 *   - "Technical Diagnostics" (expandable audit trace for developers & compliance)
 */
export default function SduiFallbackError({
  error,
  pageId: propPageId,
  pageTitle,
  onRetry,
  onBack,
  onHome,
}) {
  const [isRetrying, setIsRetrying] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const storeError = useAppStore((s) => s.blueprintError);
  const activeSduiPageId = useAppStore((s) => s.activeSduiPageId);
  const selectedSubService = useAppStore((s) => s.selectedSubService);
  const searchContext = useAppStore((s) => s.searchContext);
  const fetchBlueprint = useAppStore((s) => s.fetchBlueprint);
  const clearBlueprintError = useAppStore((s) => s.clearBlueprintError);
  const goHome = useAppStore((s) => s.goHome);
  const selectSubService = useAppStore((s) => s.selectSubService);

  const currentError = error || storeError;
  const pageId = propPageId || activeSduiPageId || selectedSubService?.pageId || selectedSubService?.menuId || "N/A";
  const title = pageTitle || selectedSubService?.menuName || `Banking Page #${pageId}`;

  // Parse structured error attributes
  const isObject = typeof currentError === "object" && currentError !== null;
  const errorType = isObject ? currentError.type || "MICROSERVICE_ERROR" : "SERVICE_ERROR";
  const statusCode = isObject ? currentError.status || 500 : 500;
  const rawMessage = isObject ? currentError.message : String(currentError || "An unexpected microservice error occurred.");
  const timestamp = isObject ? currentError.timestamp || new Date().toISOString() : new Date().toISOString();

  // Classify severity, badge styling, and guidance message
  const isTimeout =
    errorType === "TIMEOUT" ||
    statusCode === 504 ||
    rawMessage?.toLowerCase().includes("timeout") ||
    rawMessage?.toLowerCase().includes("abort");

  const isNotFound = errorType === "NOT_FOUND" || statusCode === 404;

  const badgeColor = isTimeout
    ? "bg-amber-50 text-amber-800 border-amber-200"
    : isNotFound
    ? "bg-sky-50 text-sky-800 border-sky-200"
    : "bg-rose-50 text-rose-800 border-rose-200";

  const badgeLabel = isTimeout
    ? "GATEWAY TIMEOUT (504)"
    : isNotFound
    ? "BLUEPRINT NOT FOUND (404)"
    : `SERVICE UNAVAILABLE (${statusCode})`;

  const headingText = isTimeout
    ? "Gateway Request Timed Out"
    : isNotFound
    ? "UI Blueprint Not Found"
    : "Core Banking Gateway Unavailable";

  const guidanceMessage = isTimeout
    ? "The SDUI Gateway did not receive a timely response from the backend blueprint generator. The core banking microservice may be experiencing high traffic or network latency."
    : isNotFound
    ? "The requested service blueprint is currently not registered or inactive in the database (PAGE_UI_BLUEPRINT). Please verify your service configuration."
    : "Unable to establish communication with the SDUI Gateway microservice. Our automated resilience safeguards have prevented a system crash.";

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      if (onRetry) {
        await onRetry();
      } else if (fetchBlueprint && pageId !== "N/A") {
        await fetchBlueprint(pageId, searchContext);
      }
    } catch (e) {
      console.warn("[SduiFallbackError] Retry attempt failed:", e);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else if (clearBlueprintError) {
      clearBlueprintError();
      if (selectedSubService) {
        selectSubService(selectedSubService);
      }
    }
  };

  const handleGoHome = () => {
    if (onHome) {
      onHome();
    } else if (goHome) {
      clearBlueprintError?.();
      goHome();
    }
  };

  return (
    <div className="mx-auto max-w-2xl py-8 animate-fadeIn">
      {/* ── Main Error Card ─────────────────────────────────────────────── */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl">
        {/* Top Status Gradient Strip */}
        <div
          className={`h-2.5 w-full ${
            isTimeout
              ? "bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600"
              : isNotFound
              ? "bg-gradient-to-r from-sky-400 via-indigo-500 to-sky-600"
              : "bg-gradient-to-r from-rose-500 via-red-600 to-rose-700"
          }`}
        />

        <div className="p-8 sm:p-10">
          {/* Header Row: Icon & Status Badge */}
          <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div
                className={`flex h-14 w-14 items-center justify-center rounded-2xl text-2xl shadow-sm ${
                  isTimeout
                    ? "bg-amber-100 text-amber-700 ring-4 ring-amber-50"
                    : isNotFound
                    ? "bg-sky-100 text-sky-700 ring-4 ring-sky-50"
                    : "bg-rose-100 text-rose-700 ring-4 ring-rose-50"
                }`}
              >
                {isTimeout ? "⏳" : isNotFound ? "📋" : "⚡"}
              </div>
              <div>
                <span className="block text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  SDUI Fallback Mechanism
                </span>
                <h2 className="text-xl font-extrabold text-slate-900 tracking-tight">
                  {headingText}
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold border font-mono ${badgeColor}`}>
                <span className="h-2 w-2 rounded-full bg-current animate-pulse" />
                <span>{badgeLabel}</span>
              </span>
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 font-mono">
                Page #{pageId}
              </span>
            </div>
          </div>

          {/* Context Banner */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/80 p-4 mb-6">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1">
              <span>Target Service:</span>
              <span className="font-semibold text-slate-800">{title}</span>
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              {guidanceMessage}
            </p>
          </div>

          {/* Graceful Error Explanation Box */}
          <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-4 mb-8">
            <span className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
              Gateway Diagnostic Output:
            </span>
            <p className="font-mono text-xs font-medium text-slate-700 break-words">
              {rawMessage}
            </p>
          </div>

          {/* Action Recovery Buttons */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            <button
              type="button"
              onClick={handleRetry}
              disabled={isRetrying}
              className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md shadow-indigo-600/20 transition hover:bg-indigo-700 active:scale-98 disabled:opacity-50"
            >
              {isRetrying ? (
                <>
                  <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Reconnecting to Gateway…</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  <span>Retry Blueprint Request</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleBack}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 active:scale-98 shadow-2xs"
            >
              <svg className="h-4 w-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Sub-Services</span>
            </button>

            <button
              type="button"
              onClick={handleGoHome}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-100 active:scale-98"
            >
              <span>Dashboard Home</span>
            </button>
          </div>

          {/* Toggle Diagnostics Drawer */}
          <div className="mt-8 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={() => setShowDiagnostics((prev) => !prev)}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 transition"
            >
              <svg
                className={`h-3.5 w-3.5 transition-transform ${showDiagnostics ? "rotate-90" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
              <span>{showDiagnostics ? "Hide Technical Diagnostics" : "View Technical Diagnostics & Trace"}</span>
            </button>

            {showDiagnostics && (
              <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-900 p-4 text-emerald-400 font-mono text-[11px] overflow-x-auto shadow-inner">
                <div className="mb-2 text-slate-400 font-sans text-xs flex justify-between border-b border-slate-800 pb-1">
                  <span>RESILIENCE TRACE LOG</span>
                  <span>{timestamp}</span>
                </div>
                <pre>
                  {JSON.stringify(
                    {
                      errorType,
                      statusCode,
                      pageId,
                      subService: selectedSubService?.menuName,
                      searchContext: searchContext || null,
                      resiliencePolicy: "FALLBACK_COMPONENT_ACTIVE",
                      zeroBlankScreenEnforced: true,
                      timestamp,
                    },
                    null,
                    2
                  )}
                </pre>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
