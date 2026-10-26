"use client";

import React from "react";
import { useFormContext } from "react-hook-form";

/**
 * ActionButton (SDUI Widget)
 * --------------------------------------------------------------------
 * High-visibility action trigger that submits the dynamic FormProvider
 * context. Reads loading and validation state directly from react-hook-form.
 *
 * @param {Object} props
 * @param {string} [props.label="Submit"]       - Display text on the button.
 * @param {Object} [props.actionMetadata]       - Destination endpoint & HTTP method.
 * @param {string} [props.variant="primary"]    - Styling variant (primary | secondary | danger).
 * @param {boolean} [props.disabled=false]     - Explicit disable toggle.
 */
export default function ActionButton({
  label = "Submit",
  actionMetadata,
  variant = "primary",
  disabled = false,
}) {
  const formContext = useFormContext();
  const isSubmitting = Boolean(formContext?.formState?.isSubmitting);
  const isValid = formContext ? formContext.formState.isValid : true;

  // Variant palette map
  const variantStyles = {
    primary:
      "bg-indigo-600 text-white hover:bg-indigo-700 active:bg-indigo-800 focus:ring-indigo-500 shadow-indigo-200",
    secondary:
      "bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300 focus:ring-slate-400 shadow-slate-100",
    emerald:
      "bg-emerald-600 text-white hover:bg-emerald-700 active:bg-emerald-800 focus:ring-emerald-500 shadow-emerald-200",
    danger:
      "bg-rose-600 text-white hover:bg-rose-700 active:bg-rose-800 focus:ring-rose-500 shadow-rose-200",
  };

  const activeStyle = variantStyles[variant] || variantStyles.primary;

  return (
    <div className="flex w-full items-center justify-end pt-2">
      <button
        type="submit"
        disabled={disabled || isSubmitting}
        data-endpoint={actionMetadata?.endpoint || ""}
        data-method={actionMetadata?.method || "POST"}
        className={`relative inline-flex items-center justify-center rounded-lg px-6 py-3 text-sm font-semibold tracking-wide shadow-md transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60 ${activeStyle}`}
      >
        {isSubmitting ? (
          <>
            <svg
              className="mr-2 h-4 w-4 animate-spin text-current"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <span>Processing...</span>
          </>
        ) : (
          <span>{label}</span>
        )}
      </button>
    </div>
  );
}
