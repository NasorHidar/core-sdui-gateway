"use client";

/**
 * SkeletonForm (Phase 3 — React Hook Form + Action Dispatcher)
 * --------------------------------------------------------------------
 * Fully dynamic form driven by the SDUI blueprint's `fields[]` array.
 *
 * Upgrades from Phase 2:
 *   - React Hook Form replaces manual useState for field tracking.
 *   - Validation rules (required, minLength, maxLength, pattern) are
 *     dynamically registered from each field's `rules` object.
 *   - On submit, calls the Central Action Dispatcher (executeDynamicAction)
 *     with the form's `actionId` and captured values.
 *   - Loading / error state is read from Zustand's `actionStates`.
 *
 * Blueprint contract:
 *   {
 *     "type": "Skeleton_Form",
 *     "id":   "search_form_1",
 *     "props": {
 *       "title":   "Account Lookup",
 *       "fields":  [
 *         {
 *           "name":      "accountNo",
 *           "label":     "Account Number",
 *           "inputType": "text",
 *           "placeholder": "e.g. 1234567890",
 *           "rules": { "required": true, "minLength": 13, "pattern": "^\\d+$" }
 *         }
 *       ],
 *       "actionId": 101
 *     }
 *   }
 *
 * Safety:
 *   - Every field access uses optional chaining.
 *   - Missing `rules` or malformed patterns degrade to "no validation".
 *   - Unregistered inputTypes fall back to "text".
 *   - If actionId is null/missing, submit logs a warning instead of crashing.
 */

import { useForm } from "react-hook-form";
import { executeDynamicAction } from "@/utils/actionDispatcher";
import useSduiStore from "@/store/useSduiStore";

// ─── Input Type Whitelist ──────────────────────────────────────────────
// Prevents injection of exotic input types from the backend.
const ALLOWED_INPUT_TYPES = new Set([
  "text", "email", "password", "number", "tel", "url", "search", "date",
]);

function safeInputType(raw) {
  return ALLOWED_INPUT_TYPES.has(raw) ? raw : "text";
}

// ─── Rule Builder ──────────────────────────────────────────────────────
/**
 * Translates the blueprint's `rules` object into React Hook Form's
 * validation registration object.
 *
 * Supported rule keys:
 *   required  : boolean | string (custom message)
 *   minLength : number
 *   maxLength : number
 *   pattern   : string (regex source — flags are not expected from backend)
 *   min       : number (for numeric inputs)
 *   max       : number (for numeric inputs)
 *
 * @param {Object}  rules - Raw rules from the blueprint field.
 * @param {string}  label - Field label for human-readable error messages.
 * @returns {Object} React Hook Form compatible validation config.
 */
function buildValidation(rules, label = "This field") {
  if (!rules || typeof rules !== "object") return {};

  const validation = {};

  // Required
  if (rules.required) {
    validation.required =
      typeof rules.required === "string"
        ? rules.required
        : `${label} is required`;
  }

  // Min length
  if (typeof rules.minLength === "number" && rules.minLength > 0) {
    validation.minLength = {
      value: rules.minLength,
      message: `${label} must be at least ${rules.minLength} characters`,
    };
  }

  // Max length
  if (typeof rules.maxLength === "number" && rules.maxLength > 0) {
    validation.maxLength = {
      value: rules.maxLength,
      message: `${label} must not exceed ${rules.maxLength} characters`,
    };
  }

  // Regex pattern
  if (typeof rules.pattern === "string" && rules.pattern.length > 0) {
    try {
      validation.pattern = {
        value: new RegExp(rules.pattern),
        message: rules.patternMessage ?? `${label} format is invalid`,
      };
    } catch {
      // Malformed regex from backend — skip silently rather than crash.
      console.warn(`[SkeletonForm] Invalid regex pattern for ${label}: ${rules.pattern}`);
    }
  }

  // Numeric min/max
  if (typeof rules.min === "number") {
    validation.min = {
      value: rules.min,
      message: `${label} must be at least ${rules.min}`,
    };
  }
  if (typeof rules.max === "number") {
    validation.max = {
      value: rules.max,
      message: `${label} must not exceed ${rules.max}`,
    };
  }

  return validation;
}

// ─── Component ──────────────────────────────────────────────────────────

export default function SkeletonForm({
  id: formId,
  title = "Form",
  fields = [],
  actionId = null,
}) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ mode: "onBlur" });

  // Subscribe to the action's loading/error state from the Zustand store.
  // Selector uses shallow compare — only re-renders if this specific
  // action's state changes, not on any other store mutation.
  const actionState = useSduiStore(
    (state) => state.actionStates?.[actionId] ?? { loading: false, error: null }
  );
  const isLoading = isSubmitting || actionState.loading;

  /**
   * Submit handler wired to React Hook Form.
   * Only fires after all validation rules pass.
   */
  const onSubmit = async (data) => {
    if (actionId == null) {
      console.warn("[SkeletonForm] No actionId configured — submit is a no-op.");
      return;
    }

    // Sync form snapshot into Zustand (for cross-widget access if needed)
    const { setFormData } = useSduiStore.getState();
    setFormData(formId ?? "unknown_form", data);

    // Dispatch the action
    const result = await executeDynamicAction(actionId, data);

    // Optionally reset the form on success
    if (result?.success) {
      // Keep form populated so user can refine and re-search.
      // Uncomment the next line if clear-on-success is desired:
      // reset();
    }
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
      noValidate
    >
      {/* ─── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {actionId != null && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            action #{actionId}
          </span>
        )}
      </header>

      {/* ─── Action-level error banner ──────────────────────────── */}
      {actionState.error && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
        >
          <p className="font-semibold">Action failed</p>
          <p className="mt-1">{actionState.error}</p>
        </div>
      )}

      {/* ─── Fields ─────────────────────────────────────────────── */}
      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">No fields configured for this form.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field, idx) => {
            const name = field?.name || `field_${idx}`;
            const label = field?.label || name;
            const htmlId = `f_${formId ?? "form"}_${name}_${idx}`;
            const rules = field?.rules ?? {};
            const validation = buildValidation(rules, label);
            const fieldError = errors?.[name];

            return (
              <div key={htmlId} className="flex flex-col gap-1">
                <label
                  htmlFor={htmlId}
                  className="text-sm font-medium text-slate-700"
                >
                  {label}
                  {rules.required && (
                    <span className="ml-1 text-red-600" aria-label="required">
                      *
                    </span>
                  )}
                </label>

                <input
                  id={htmlId}
                  type={safeInputType(field?.inputType)}
                  placeholder={field?.placeholder ?? ""}
                  disabled={isLoading}
                  aria-invalid={fieldError ? "true" : "false"}
                  aria-describedby={fieldError ? `${htmlId}_err` : undefined}
                  className={`w-full rounded-lg border px-3 py-2 text-sm text-slate-900
                    placeholder-slate-400 transition
                    focus:outline-none focus:ring-2
                    ${
                      fieldError
                        ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
                        : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/30"
                    }
                    disabled:cursor-not-allowed disabled:bg-slate-100`}
                  {...register(name, validation)}
                />

                {/* ─── Field-level error ─────────────────────────── */}
                {fieldError && (
                  <p
                    id={`${htmlId}_err`}
                    role="alert"
                    className="text-xs text-red-600"
                  >
                    {fieldError.message || "Invalid value"}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Submit ─────────────────────────────────────────────── */}
      <div className="flex justify-end">
        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5
                     text-sm font-semibold text-white shadow-sm transition
                     hover:bg-brand-700
                     focus:outline-none focus:ring-2 focus:ring-brand-500/40
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading && (
            <svg
              className="h-4 w-4 animate-spin"
              viewBox="0 0 24 24"
              fill="none"
              aria-hidden="true"
            >
              <circle
                cx="12" cy="12" r="10"
                stroke="currentColor" strokeWidth="3" opacity="0.25"
              />
              <path
                d="M4 12a8 8 0 018-8"
                stroke="currentColor" strokeWidth="3" strokeLinecap="round"
              />
            </svg>
          )}
          {isLoading ? "Processing…" : "Submit"}
        </button>
      </div>
    </form>
  );
}
