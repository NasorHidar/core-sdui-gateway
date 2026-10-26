"use client";

import { useState, useEffect, useMemo } from "react";
import useAppStore, { getFallbackSearchSkeleton } from "@/store/useAppStore";

/**
 * Validates a single form field value against its skeleton validation rules.
 *
 * @param {object} field - Skeleton field configuration
 * @param {any} rawValue - User's current input
 * @returns {string|null} Error message or null if valid
 */
function validateFieldValue(field, rawValue) {
  const value = rawValue !== undefined && rawValue !== null ? String(rawValue).trim() : "";
  const validation = field.validation || {};

  // 1. Required Check
  if (field.required && !value) {
    return `${field.label} is required.`;
  }

  // If empty and not required, pass
  if (!value) return null;

  // 2. Regex Pattern Check
  if (validation.pattern) {
    try {
      const regex = new RegExp(validation.pattern);
      if (!regex.test(value)) {
        return validation.message || `${field.label} format is invalid.`;
      }
    } catch (e) {
      console.warn(`[Validation] Invalid pattern regex for field ${field.name}:`, validation.pattern);
    }
  }

  // 3. Min/Max Length Checks
  if (validation.minLength !== undefined && validation.minLength !== null) {
    if (value.length < validation.minLength) {
      return validation.message || `Must be at least ${validation.minLength} characters.`;
    }
  }

  if (validation.maxLength !== undefined && validation.maxLength !== null) {
    if (value.length > validation.maxLength) {
      return validation.message || `Cannot exceed ${validation.maxLength} characters.`;
    }
  }

  // 4. Numeric Range Checks
  if (field.inputType === "number" || typeof validation.min === "number" || typeof validation.max === "number") {
    const num = Number(value);
    if (isNaN(num)) {
      return "Must be a valid numeric value.";
    }
    if (typeof validation.min === "number" && num < validation.min) {
      return validation.message || `Minimum value is ${validation.min}.`;
    }
    if (typeof validation.max === "number" && num > validation.max) {
      return validation.message || `Maximum value is ${validation.max}.`;
    }
  }

  return null;
}

/**
 * SearchPromptBox — 100% Dynamic Skeleton-Driven Search Interface
 * ─────────────────────────────────────────────────────────────────────────────
 * Dynamically generated search box component based on a backend UI 'skeleton'.
 *
 * Capabilities:
 *   1. Dynamic Field Rendering: none (Smart Bypass), 1 field, or multiple fields.
 *   2. Dynamic Validation: regex patterns, required flags, length/numeric ranges.
 *   3. Smart Bypass: Automatically skips UI when 0 search parameters are required.
 *   4. Real-time Feedback: Visual validation badges, formatted rule hints, inline errors.
 */
export default function SearchPromptBox() {
  const selectedSubService = useAppStore((s) => s.selectedSubService);
  const searchSkeleton = useAppStore((s) => s.searchSkeleton);
  const searchSkeletonLoading = useAppStore((s) => s.searchSkeletonLoading);
  const fetchBlueprint = useAppStore((s) => s.fetchBlueprint);
  const blueprintLoading = useAppStore((s) => s.blueprintLoading);
  const blueprintError = useAppStore((s) => s.blueprintError);

  const pageId = selectedSubService?.pageId || selectedSubService?.menuId;

  // Resolve skeleton: use store skeleton or fallback
  const activeSkeleton = useMemo(() => {
    if (searchSkeleton) return searchSkeleton;
    if (selectedSubService?.searchSkeleton) return selectedSubService.searchSkeleton;
    if (pageId) return getFallbackSearchSkeleton(pageId, selectedSubService?.menuId);
    return null;
  }, [searchSkeleton, selectedSubService, pageId]);

  const fields = useMemo(
    () => activeSkeleton?.fields || [],
    [activeSkeleton?.fields]
  );
  const requiresSearch =
    activeSkeleton?.requiresSearch !== false && Array.isArray(fields) && fields.length > 0;

  // Form values state & touched tracking
  const [formData, setFormData] = useState({});
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);

  // Initialize form default values when skeleton or sub-service changes
  useEffect(() => {
    if (!fields || fields.length === 0) {
      setFormData({});
      setTouched({});
      setSubmitted(false);
      return;
    }

    const initial = {};
    fields.forEach((f) => {
      initial[f.name] = f.defaultValue !== undefined && f.defaultValue !== null ? f.defaultValue : "";
    });
    setFormData(initial);
    setTouched({});
    setSubmitted(false);
  }, [selectedSubService?.menuId, pageId, fields]);

  // Compute live validation errors for all fields
  const errors = useMemo(() => {
    const errMap = {};
    fields.forEach((f) => {
      const val = formData[f.name];
      const errorMsg = validateFieldValue(f, val);
      if (errorMsg) {
        errMap[f.name] = errorMsg;
      }
    });
    return errMap;
  }, [fields, formData]);

  const isFormValid = Object.keys(errors).length === 0;

  if (!selectedSubService) return null;

  // ── SMART BYPASS ACTIVATION SCREEN (0 Search Parameters) ────────────────────
  if (!requiresSearch) {
    return (
      <div className="mx-auto max-w-xl text-center py-12">
        <div className="rounded-3xl border border-indigo-100 bg-white p-8 shadow-lg">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-50 text-3xl">
            ⚡
          </div>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700 border border-emerald-200 mb-3">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Smart Bypass Activated</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900">
            {activeSkeleton?.title || selectedSubService.menuName}
          </h2>
          <p className="mt-2 text-xs text-slate-500 max-w-md mx-auto">
            This sub-service requires <strong>0 search parameters</strong>. The frontend has
            automatically bypassed the search interface and dispatched a direct request to the backend engine.
          </p>

          <div className="mt-6 flex flex-col items-center justify-center gap-3">
            <div className="flex items-center gap-2 text-xs font-medium text-indigo-600">
              <svg className="h-4 w-4 animate-spin text-indigo-600" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span>Loading dynamic blueprint for Page #{pageId}…</span>
            </div>
            <div className="h-1.5 w-48 overflow-hidden rounded-full bg-slate-100">
              <div className="h-full w-2/3 animate-pulse rounded-full bg-indigo-600" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Handle field change
  const handleChange = (fieldName, value) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
  };

  // Handle blur
  const handleBlur = (fieldName) => {
    setTouched((prev) => ({ ...prev, [fieldName]: true }));
  };

  // Handle form submit
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);

    // Mark all fields as touched
    const allTouched = {};
    fields.forEach((f) => (allTouched[f.name] = true));
    setTouched(allTouched);

    if (!isFormValid) {
      return;
    }

    // Pass formatted values as search context to blueprint loader
    await fetchBlueprint(pageId, {
      ...formData,
      searchValue: formData[fields[0]?.name] || "",
      subServiceName: selectedSubService.menuName,
    });

    // Comprehensive Audit: asynchronously track search interaction without slowing down UI
    try {
      const token = useAppStore.getState?.()?.jwtToken;
      if (token) {
        fetch("/api/v1/audit/track", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            action: "SEARCH_QUERY",
            targetEndpoint: `/api/v1/pages/${pageId}/blueprint`,
            referenceKey: String(formData[fields[0]?.name] || `SEARCH-${pageId}`),
            payload: {
              searchInputs: formData,
              pageId,
              subServiceName: selectedSubService.menuName,
            },
            executionStatus: "SUCCESS",
          }),
        }).catch(() => {});
      }
    } catch (_) {}
  };

  return (
    <div className="mx-auto max-w-xl">
      {/* ── Context & Skeleton Header ───────────────────────────────────── */}
      <div className="mb-6">
        <div className="flex items-center justify-between gap-2 mb-1.5">
          <div className="flex items-center gap-2">
            <span className="text-xl">{activeSkeleton?.icon || "🔍"}</span>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
              Skeleton-Driven Search Box
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
              {fields.length} Dynamic Field{fields.length !== 1 ? "s" : ""}
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
              Page #{pageId}
            </span>
          </div>
        </div>

        <h2 className="text-xl font-bold text-slate-900">
          {activeSkeleton?.title || selectedSubService.menuName}
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          {activeSkeleton?.subtitle || "Provide the required parameters below to dynamically load the SDUI page."}
        </p>
      </div>

      {/* ── Dynamic Form Card ───────────────────────────────────────────── */}
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-md transition-all">
        {searchSkeletonLoading ? (
          <div className="space-y-4 py-6">
            <div className="h-4 w-1/3 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
            <div className="h-4 w-1/4 animate-pulse rounded bg-slate-200" />
            <div className="h-10 w-full animate-pulse rounded-lg bg-slate-100" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            {fields.map((field, idx) => {
              const fieldName = field.name;
              const value = formData[fieldName] ?? "";
              const error = errors[fieldName];
              const isTouched = touched[fieldName] || submitted;
              const hasError = isTouched && !!error;
              const isValid = isTouched && !error && value !== "";
              const validation = field.validation;

              return (
                <div key={fieldName} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label
                      htmlFor={`input-${fieldName}`}
                      className="block text-xs font-bold text-slate-700"
                    >
                      {field.label}
                      {field.required && (
                        <span className="ml-1 text-rose-500" title="Required field">
                          *
                        </span>
                      )}
                    </label>

                    {/* Rule hint / regex pattern tag */}
                    {validation?.pattern && (
                      <span className="font-mono text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                        Pattern: {validation.pattern}
                      </span>
                    )}
                  </div>

                  <div className="relative">
                    {field.inputType === "select" ? (
                      <select
                        id={`input-${fieldName}`}
                        value={value}
                        onChange={(e) => handleChange(fieldName, e.target.value)}
                        onBlur={() => handleBlur(fieldName)}
                        disabled={blueprintLoading}
                        className={`
                          w-full rounded-xl border bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 outline-none transition
                          focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50
                          ${hasError ? "border-rose-400 bg-rose-50/30" : isValid ? "border-emerald-400 bg-emerald-50/10" : "border-slate-300"}
                        `}
                      >
                        {Array.isArray(field.options) &&
                          field.options.map((opt) => {
                            const optVal = typeof opt === "object" ? opt.value : opt;
                            const optLabel = typeof opt === "object" ? opt.label : opt;
                            return (
                              <option key={optVal} value={optVal}>
                                {optLabel}
                              </option>
                            );
                          })}
                      </select>
                    ) : (
                      <input
                        id={`input-${fieldName}`}
                        type={field.inputType || "text"}
                        value={value}
                        onChange={(e) => handleChange(fieldName, e.target.value)}
                        onBlur={() => handleBlur(fieldName)}
                        placeholder={field.placeholder || `Enter ${field.label.toLowerCase()}…`}
                        disabled={blueprintLoading}
                        autoFocus={idx === 0}
                        className={`
                          w-full rounded-xl border bg-slate-50/60 px-3.5 py-2.5 text-xs text-slate-900 placeholder-slate-400 outline-none transition
                          focus:border-indigo-500 focus:bg-white focus:ring-2 focus:ring-indigo-500/20 disabled:opacity-50
                          ${hasError ? "border-rose-400 bg-rose-50/30 ring-1 ring-rose-300" : isValid ? "border-emerald-400 bg-emerald-50/10" : "border-slate-300"}
                        `}
                      />
                    )}

                    {/* Live Validation Status Icon */}
                    <div className="absolute right-3 top-2.5 flex items-center pointer-events-none">
                      {isValid && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-emerald-600">
                          ✓
                        </span>
                      )}
                      {hasError && (
                        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-rose-100 text-[11px] font-bold text-rose-600">
                          !
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Inline Error Message */}
                  {hasError && (
                    <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium">
                      <svg className="h-3 w-3 shrink-0" viewBox="0 0 20 20" fill="currentColor">
                        <path
                          fillRule="evenodd"
                          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span>{error}</span>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Error Banner */}
            {blueprintError && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
                <span className="font-semibold">Backend Error:</span> {blueprintError}
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2 flex items-center gap-3">
              <button
                type="submit"
                disabled={blueprintLoading}
                className={`
                  flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-bold text-white shadow transition
                  ${
                    isFormValid
                      ? "bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99]"
                      : "bg-indigo-400 opacity-90 cursor-pointer"
                  }
                  disabled:opacity-50
                `}
              >
                {blueprintLoading ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Fetching SDUI Blueprint…</span>
                  </>
                ) : (
                  <span>{activeSkeleton?.submitLabel || "Search & Render"}</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  const resetVals = {};
                  fields.forEach((f) => (resetVals[f.name] = f.defaultValue || ""));
                  setFormData(resetVals);
                  setTouched({});
                  setSubmitted(false);
                }}
                disabled={blueprintLoading}
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Reset
              </button>
            </div>
          </form>
        )}
      </div>

      {/* ── Resilience & Fallback Simulator (Verification Controls) ────────── */}
      <div className="mt-4 rounded-2xl border border-slate-200/80 bg-slate-100/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-slate-500 text-[11px] font-semibold">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>Resilience Safeguards:</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchBlueprint(pageId, formData, { simulateTimeout: true })}
              className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-semibold text-amber-800 transition hover:bg-amber-100 active:scale-95"
            >
              Simulate API Timeout (504)
            </button>
            <button
              type="button"
              onClick={() => fetchBlueprint(pageId, formData, { simulateDown: true })}
              className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-[11px] font-semibold text-rose-800 transition hover:bg-rose-100 active:scale-95"
            >
              Simulate Microservice Down (503)
            </button>
          </div>
        </div>
      </div>

      {/* ── Security & Metadata Footnote ─────────────────────────────────── */}
      <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 px-1">
        <span>Dynamic Client-Side Validation Active</span>
        <span className="font-mono">SVRD_PAGE_ID #{pageId}</span>
      </div>
    </div>
  );
}
