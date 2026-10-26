"use client";

import React from "react";
import { useFormContext } from "react-hook-form";

/**
 * Builds validation options dynamically from JSON field constraints.
 *
 * @param {Object} field - Single field definition from JSON blueprint.
 * @returns {Object} react-hook-form validation options.
 */
function buildValidationRules(field) {
  const rules = {};
  const label = field?.label || field?.name || "Field";

  // If explicitly read-only, skip interactive validation rules
  if (field?.readOnly || field?.disabled || field?.isReadOnly || field?.editable === false) {
    return rules;
  }

  // 1. Required validation
  if (field?.required) {
    rules.required =
      typeof field.required === "string"
        ? field.required
        : `${label} is required`;
  }

  // 2. Minimum numeric value
  if (field?.min !== undefined && field?.min !== null) {
    rules.min = {
      value: Number(field.min),
      message: `${label} must be at least ${field.min}`,
    };
  }

  // 3. Maximum numeric value
  if (field?.max !== undefined && field?.max !== null) {
    rules.max = {
      value: Number(field.max),
      message: `${label} cannot exceed ${field.max}`,
    };
  }

  // 4. Minimum string length
  if (field?.minLength) {
    rules.minLength = {
      value: Number(field.minLength),
      message: `${label} must have at least ${field.minLength} characters`,
    };
  }

  // 5. Maximum string length
  if (field?.maxLength) {
    rules.maxLength = {
      value: Number(field.maxLength),
      message: `${label} cannot exceed ${field.maxLength} characters`,
    };
  }

  // 6. Regex Pattern
  if (field?.pattern) {
    try {
      const regex =
        field.pattern instanceof RegExp
          ? field.pattern
          : new RegExp(field.pattern);
      rules.pattern = {
        value: regex,
        message: field?.patternMessage || `${label} format is invalid`,
      };
    } catch {
      // Ignore invalid regex patterns from backend gracefully
    }
  }

  // 7. Numeric conversion rule
  if (field?.type === "number") {
    rules.valueAsNumber = true;
  }

  return rules;
}

/**
 * InputGroup (SDUI Widget)
 * --------------------------------------------------------------------
 * Strict Access Control Enforcement:
 * - Only specific, explicitly designated fields within the JSON schema
 *   render as interactive input elements for user data entry.
 * - Any fields marked as read-only or fetched from backend data render
 *   strictly as unmodifiable locked fields.
 *
 * @param {Object} props
 * @param {Array<Object>} [props.fields] - List of dynamic field definitions from schema.
 * @param {string} [props.title]        - Optional group title.
 */
export default function InputGroup({ fields = [], title }) {
  const formContext = useFormContext();

  // Defensive fallback: If not wrapped in FormProvider, warn gracefully
  if (!formContext) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-xs text-amber-800">
        [InputGroup] Warning: Component must be mounted inside a react-hook-form FormProvider.
      </div>
    );
  }

  const {
    register,
    formState: { errors = {} },
  } = formContext;

  const safeFields = Array.isArray(fields) ? fields : [];

  if (safeFields.length === 0) {
    return null;
  }

  const interactiveCount = safeFields.filter(
    (f) => !f.readOnly && !f.disabled && !f.isReadOnly && f.editable !== false
  ).length;

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all">
      {/* Group Header with Access Control Indicator */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <h4 className="text-sm font-bold tracking-tight text-slate-800">
            {title || "Dynamic Form Section"}
          </h4>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Explicitly designated fields for user transaction entry
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-0.5 text-[10px] font-semibold text-indigo-700 border border-indigo-200">
            <span>✎ {interactiveCount} Interactive Field{interactiveCount !== 1 ? "s" : ""}</span>
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
        {safeFields.map((field, idx) => {
          const fieldName = field?.name || `field_${idx}`;
          const fieldType = (field?.type || "text").toLowerCase();
          const fieldLabel = field?.label || fieldName;
          const isRequired = Boolean(field?.required);
          const isReadOnly = Boolean(
            field?.readOnly || field?.disabled || field?.isReadOnly || field?.editable === false
          );
          const errorMessage = errors?.[fieldName]?.message;
          const validationRules = buildValidationRules(field);

          return (
            <div
              key={fieldName}
              className={`flex flex-col ${
                fieldType === "textarea" ? "md:col-span-2" : "col-span-1"
              }`}
            >
              {/* Field Label & Access Control Status Tag */}
              <label
                htmlFor={fieldName}
                className="mb-1.5 flex items-center justify-between text-xs font-semibold text-slate-700"
              >
                <span className="flex items-center gap-1">
                  <span>{fieldLabel}</span>
                  {isRequired && !isReadOnly && (
                    <span className="text-rose-500 font-bold" title="Required field">
                      *
                    </span>
                  )}
                </span>

                {/* Explicit Access Control Tag */}
                {isReadOnly ? (
                  <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 select-none">
                    <span>🔒 Read-Only</span>
                  </span>
                ) : (
                  <span className="font-mono text-[9px] text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 select-none">
                    <span>✎ User Entry</span>
                  </span>
                )}
              </label>

              {/* Dynamic Input Element Mapping */}
              {isReadOnly ? (
                /* ── Read-Only Locked Field (Strict Access Control) ─────────────── */
                <div className="relative">
                  <input
                    id={fieldName}
                    type="text"
                    readOnly
                    tabIndex={-1}
                    defaultValue={field?.defaultValue || field?.value || ""}
                    placeholder={field?.placeholder || "System-governed value"}
                    className="w-full rounded-xl border border-slate-200 bg-slate-100/80 px-3.5 py-2.5 pr-8 text-xs font-medium text-slate-600 outline-none cursor-not-allowed select-all"
                    {...register(fieldName, { value: field?.defaultValue || field?.value || "" })}
                  />
                  <div className="absolute right-3 top-2.5 text-xs text-slate-400 pointer-events-none">
                    🔒
                  </div>
                </div>
              ) : fieldType === "textarea" ? (
                /* ── Interactive Textarea ────────────────────────────────────────── */
                <textarea
                  id={fieldName}
                  placeholder={field?.placeholder || `Enter ${fieldLabel.toLowerCase()}…`}
                  rows={field?.rows || 3}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:ring-2 ${
                    errorMessage
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-200"
                      : "border-slate-300 bg-white hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-100"
                  }`}
                  {...register(fieldName, validationRules)}
                />
              ) : fieldType === "select" && Array.isArray(field?.options) ? (
                /* ── Interactive Select Dropdown ─────────────────────────────────── */
                <select
                  id={fieldName}
                  className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 outline-none transition-colors focus:ring-2 ${
                    errorMessage
                      ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-200"
                      : "border-slate-300 bg-white hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-100"
                  }`}
                  {...register(fieldName, validationRules)}
                >
                  <option value="">{field?.placeholder || "Select option…"}</option>
                  {field.options.map((opt) => {
                    const optVal = typeof opt === "object" ? opt?.value : opt;
                    const optLabel = typeof opt === "object" ? opt?.label : opt;
                    return (
                      <option key={String(optVal)} value={optVal}>
                        {optLabel}
                      </option>
                    );
                  })}
                </select>
              ) : (
                /* ── Interactive Standard Input (text, number, etc.) ─────────────── */
                <div className="relative">
                  <input
                    id={fieldName}
                    type={fieldType}
                    placeholder={field?.placeholder || `Enter ${fieldLabel.toLowerCase()}…`}
                    step={fieldType === "number" ? field?.step || "any" : undefined}
                    className={`w-full rounded-xl border px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 outline-none transition-colors focus:ring-2 ${
                      errorMessage
                        ? "border-rose-300 bg-rose-50/20 focus:border-rose-500 focus:ring-rose-200"
                        : "border-slate-300 bg-white hover:border-slate-400 focus:border-indigo-600 focus:ring-indigo-100"
                    }`}
                    {...register(fieldName, validationRules)}
                  />
                  {field?.hint && (
                    <div className="mt-1 text-[10px] text-slate-400">{field.hint}</div>
                  )}
                </div>
              )}

              {/* Dynamic Error Feedback */}
              {errorMessage && (
                <p
                  role="alert"
                  className="mt-1.5 flex items-center text-xs font-medium text-rose-600 animate-fadeIn"
                >
                  <svg
                    className="mr-1 h-3.5 w-3.5 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {errorMessage}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
