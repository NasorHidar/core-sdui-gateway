"use client";

import React, { useState } from "react";

/**
 * Converts camelCase, snake_case, or kebab-case into human-readable Title Case.
 */
function formatLabel(key) {
  if (!key) return "";
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/[_-]+/g, " ")
    .replace(/^\w/, (c) => c.toUpperCase())
    .trim();
}

/**
 * Formats values into clean, professional UI strings.
 */
function formatValue(value) {
  if (value === null || value === undefined) return "—";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    return new Intl.NumberFormat("en-US").format(value);
  }
  if (typeof value === "object") {
    if (Array.isArray(value)) {
      return value.map((v) => (typeof v === "object" ? JSON.stringify(v) : String(v))).join(", ");
    }
    return Object.entries(value)
      .map(([k, v]) => `${formatLabel(k)}: ${v}`)
      .join(" · ");
  }
  return String(value);
}

/**
 * TransactionReceiptCard
 * --------------------------------------------------------------------
 * High-grade Core Banking Transaction Confirmation & Receipt Card.
 * Replaces raw JSON dumps with an executive, audit-ready structured layout.
 *
 * @param {Object} props
 * @param {Object} props.data           - Response payload from the core gateway.
 * @param {string} props.message        - Primary human-readable confirmation message.
 * @param {Function} [props.onReset]    - Callback to reset form for another entry.
 * @param {Function} [props.onDismiss]  - Callback to dismiss the receipt banner.
 */
export default function TransactionReceiptCard({
  data = {},
  message,
  onReset,
  onDismiss,
}) {
  const [copied, setCopied] = useState(false);

  // Extract core banking standard fields with fallbacks
  const transactionId =
    data?.transactionId ||
    data?.txnId ||
    data?.referenceId ||
    data?.refId ||
    data?.referenceNumber ||
    data?.id ||
    null;

  const rawStatus = data?.status || (data?.success ? "COMPLETED" : "PROCESSING");
  const isPending =
    rawStatus.toUpperCase().includes("PENDING") ||
    rawStatus.toUpperCase().includes("APPROVAL") ||
    rawStatus.toUpperCase().includes("CHECKER");

  const statusLabel = rawStatus
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const timestamp =
    data?.timestamp || data?.createdAt || data?.date || new Date().toISOString();

  const formattedTime = (() => {
    try {
      return new Intl.DateTimeFormat("en-US", {
        dateStyle: "medium",
        timeStyle: "short",
      }).format(new Date(timestamp));
    } catch {
      return String(timestamp);
    }
  })();

  // Filter out meta-fields already prominently displayed
  const ignoredKeys = new Set([
    "success",
    "status",
    "transactionId",
    "txnId",
    "referenceId",
    "refId",
    "referenceNumber",
    "id",
    "message",
    "timestamp",
    "createdAt",
    "date",
  ]);

  const secondaryDetails = Object.entries(data || {}).filter(
    ([k]) => !ignoredKeys.has(k)
  );

  const handleCopy = () => {
    if (!transactionId) return;
    navigator.clipboard?.writeText(transactionId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    if (typeof window !== "undefined") {
      window.print();
    }
  };

  return (
    <div
      role="status"
      className="mb-8 overflow-hidden rounded-2xl border border-emerald-200/90 bg-gradient-to-b from-emerald-50/70 via-white to-white p-6 shadow-sm transition-all animate-fadeIn sm:p-7"
    >
      {/* ── Top Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-emerald-100/80 pb-5">
        <div className="flex items-start gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm ring-4 ring-emerald-100">
            <svg
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2.5}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                Transaction Initiated Successfully
              </h2>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider ${
                  isPending
                    ? "border border-amber-300 bg-amber-50 text-amber-800"
                    : "border border-emerald-300 bg-emerald-50 text-emerald-800"
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    isPending ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
                  }`}
                />
                {statusLabel}
              </span>
            </div>
            <p className="mt-1 text-sm text-slate-600 leading-relaxed">
              {message || data?.message || "Your core banking request has been processed and logged."}
            </p>
          </div>
        </div>

        {onDismiss && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss receipt"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        )}
      </div>

      {/* ── Transaction Core Details Grid ─────────────────────────────── */}
      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Reference ID Card */}
        {transactionId && (
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5 transition hover:bg-slate-50">
            <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Reference ID
            </span>
            <div className="mt-1.5 flex items-center justify-between gap-1.5">
              <span className="font-mono text-xs font-bold text-slate-900 select-all" title={transactionId}>
                {transactionId}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                title="Copy reference ID"
                className="inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition active:scale-95 shadow-2xs"
              >
                {copied ? (
                  <span className="text-emerald-600 font-semibold">✓ Copied</span>
                ) : (
                  <>
                    <svg
                      className="h-3 w-3 text-slate-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"
                      />
                    </svg>
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* Status Card */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Workflow State
          </span>
          <div className="mt-1 flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                isPending ? "bg-amber-500 animate-pulse" : "bg-emerald-500"
              }`}
            />
            <span className="text-sm font-semibold text-slate-800">
              {isPending ? "Dual-Control Pending" : "Settled"}
            </span>
          </div>
        </div>

        {/* Dual-Control Protocol */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Security Protocol
          </span>
          <span className="mt-1 block text-sm font-semibold text-slate-800">
            Maker-Checker (Dual Auth)
          </span>
        </div>

        {/* Execution Timestamp */}
        <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
            Logged Timestamp
          </span>
          <span className="mt-1 block font-mono text-xs text-slate-700">
            {formattedTime}
          </span>
        </div>
      </div>

      {/* ── Secondary Attributes (If Any Dynamic Attributes Return) ────── */}
      {secondaryDetails.length > 0 && (
        <div className="mt-4 rounded-xl border border-slate-100 bg-white p-3.5">
          <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Additional Payload Attributes
          </span>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs sm:grid-cols-3">
            {secondaryDetails.map(([key, value]) => (
              <div key={key} className="flex flex-col">
                <span className="text-slate-500 font-medium">{formatLabel(key)}</span>
                <span className="font-semibold text-slate-800 truncate" title={String(value)}>
                  {formatValue(value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Bottom Action Toolbar ─────────────────────────────────────── */}
      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <span className="text-emerald-600 font-semibold">🔒 Audited Event</span>
          <span>·</span>
          <span>Core banking ledger updated</span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition"
          >
            <svg
              className="h-3.5 w-3.5 text-slate-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z"
              />
            </svg>
            Print Receipt
          </button>

          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 active:scale-95 transition"
            >
              <svg
                className="h-3.5 w-3.5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Initiate Another Transfer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
