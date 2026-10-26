"use client";

import { useState } from "react";
import Link from "next/link";

/**
 * JsonBlueprintInspector
 * ─────────────────────────────────────────────────────────────────────────────
 * A sleek, modern inspection bar and collapsible code viewer that displays
 * the exact JSON file loaded from disk, its metadata, and provides quick
 * navigation between all available JSON blueprints.
 */
export default function JsonBlueprintInspector({
  blueprint,
  meta,
  availableBlueprints = [],
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const formattedJson = JSON.stringify(blueprint || {}, null, 2);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(formattedJson);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error("Failed to copy:", e);
    }
  };

  const widgetCount =
    (Array.isArray(blueprint?.widgets) && blueprint.widgets.length) ||
    (Array.isArray(blueprint?.components) && blueprint.components.length) ||
    0;

  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 shadow-sm backdrop-blur-md">
      {/* Top Banner / Meta Row */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-3.5 bg-gradient-to-r from-slate-50 via-white to-indigo-50/30">
        <div className="flex items-center gap-3">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              Source File:
            </span>
            <code className="rounded bg-indigo-50/80 px-2.5 py-0.5 text-xs font-mono font-medium text-indigo-700 border border-indigo-100">
              blueprints/{meta?.fileName || `${meta?.pageId}.json`}
            </code>
          </div>
          {meta?.sizeBytes ? (
            <span className="hidden sm:inline-block text-xs text-slate-400">
              ({meta.sizeBytes} bytes · {widgetCount} {blueprint?.widgets ? "dynamic widgets" : "components"})
            </span>
          ) : null}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-indigo-600 active:scale-95"
          >
            <svg
              className={`h-3.5 w-3.5 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
            {isOpen ? "Hide Blueprint JSON" : "Inspect Blueprint JSON"}
          </button>
        </div>
      </div>

      {/* Blueprint Switcher Pills */}
      {availableBlueprints?.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto px-5 py-2.5 bg-slate-50/50 border-b border-slate-100 text-xs">
          <span className="font-medium text-slate-500 whitespace-nowrap">
            Available Blueprints:
          </span>
          <div className="flex items-center gap-1.5">
            {availableBlueprints.map((item) => {
              const isActive = String(item.pageId) === String(meta?.pageId);
              return (
                <Link
                  key={item.pageId}
                  href={`/dynamic-page/${item.pageId}`}
                  className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-mono transition ${
                    isActive
                      ? "bg-indigo-600 text-white font-semibold shadow-sm"
                      : "bg-white text-slate-600 border border-slate-200 hover:border-indigo-300 hover:text-indigo-600"
                  }`}
                >
                  <span>{item.pageId}.json</span>
                  {item.isDynamic && (
                    <span
                      className={`text-[9px] uppercase px-1 rounded ${
                        isActive
                          ? "bg-indigo-700 text-indigo-100"
                          : "bg-amber-100 text-amber-800"
                      }`}
                    >
                      Dynamic
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Collapsible JSON Viewer */}
      {isOpen && (
        <div className="relative border-t border-slate-100 bg-slate-900 text-slate-200">
          <div className="flex items-center justify-between border-b border-slate-800 px-4 py-2 text-xs text-slate-400">
            <span className="font-mono">
              JSON Structure (Physical Disk Read)
            </span>
            <button
              onClick={handleCopy}
              className="inline-flex items-center gap-1 rounded bg-slate-800 px-2.5 py-1 text-slate-300 transition hover:bg-slate-700 hover:text-white"
            >
              {copied ? (
                <>
                  <svg className="h-3.5 w-3.5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                  <span>Copy JSON</span>
                </>
              )}
            </button>
          </div>
          <pre className="max-h-96 overflow-auto p-4 font-mono text-xs leading-relaxed text-indigo-200/90 selection:bg-indigo-500 selection:text-white">
            <code>{formattedJson}</code>
          </pre>
        </div>
      )}
    </div>
  );
}
