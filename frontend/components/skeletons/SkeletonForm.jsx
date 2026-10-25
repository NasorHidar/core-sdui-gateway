"use client";

/**
 * SkeletonForm (Phase 3 — RHF + Action Dispatcher)
 * --------------------------------------------------------------------
 * Dynamic form driven by the `fields[]` array from the SDUI blueprint.
 *
 * Phase 3 upgrades:
 *   - Validation is derived from the blueprint's per-field `rules[]`
 *     (required, minLength, maxLength, pattern, email) and resolved into
 *     a Zod schema via @hookform/resolvers/zod.
 *   - On valid submit: stores the snapshot in `formData[formId]` (Zustand)
 *     and calls `executeDynamicAction(actionId, values)`.
 *   - The action dispatcher handles loading/error states, the API call,
 *     and pushing the response into `widgetData[targetWidget]`.
 *
 * Blueprint contract (Phase 3 superset of Phase 2):
 *   {
 *     "type": "Skeleton_Form",
 *     "id":   "search_form_1",
 *     "props": {
 *       "title":   "Search",
 *       "fields":  [{
 *           "name", "label", "inputType", "required", "placeholder",
 *           "rules": [{ "type": "minLength", "value": 6, "message": "Min 6 chars" }]
 *       }],
 *       "actionId": 101
 *     }
 *   }
 *
 * Safety:
 *   - Missing/malformed `fields[]` → renders an empty-state message.
 *   - inputType whitelist prevents the backend from injecting arbitrary
 *     input variants into the DOM.
 *   - Validation schema is built defensively (per-field try/catch).
 */

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useEffect, useMemo } from "react";

import useSduiStore from "@/store/useSduiStore";
import { executeDynamicAction } from "@/utils/actionDispatcher";

// ─── Input-type whitelist ──────────────────────────────────────────────
// Anything outside this set falls back to "text" so the backend cannot
// inject uncontrolled input variants.
const ALLOWED_INPUT_TYPES = new Set([
  "text", "email", "password", "number", "tel", "url", "search", "date",
]);
const safeInputType = (raw) => (ALLOWED_INPUT_TYPES.has(raw) ? raw : "text");

// ─── Zod rule builder ──────────────────────────────────────────────────
// Maps the blueprint's `rules[]` entries into a Zod schema. Defensive:
// unknown rule types are silently skipped; failures never throw.
function buildSchema(fields) {
  const shape = {};
  for (let idx = 0; idx < (fields ?? []).length; idx++) {
    const f = fields[idx] ?? {};
    const key = f.name || `field_${idx}`;
    let validator = z.string();

    try {
      for (const rule of f.rules ?? []) {
        if (!rule || typeof rule !== "object") continue;
        switch (rule.type) {
          case "required":
            if (rule.value) validator = validator.min(1, rule.message || "Required");
            break;
          case "minLength":
            validator = validator.min(Number(rule.value) || 0, rule.message);
            break;
          case "maxLength":
            validator = validator.max(Number(rule.value) || 0, rule.message);
            break;
          case "pattern":
            if (rule.value) {
              try {
                validator = validator.regex(new RegExp(rule.value), rule.message);
              } catch { /* invalid regex — skip */ }
            }
            break;
          case "email":
            validator = validator.email(rule.message);
            break;
          default:
            // Unknown rule types are ignored — schema stays strict by default.
            break;
        }
      }
    } catch {
      // Defensive: rule-building must never throw. Fall back to base string.
      validator = z.string();
    }

    if (f.required) {
      shape[key] = validator;
    } else {
      shape[key] = validator.or(z.literal("")).optional();
    }
  }
  return z.object(shape);
}

export default function SkeletonForm({
  id,
  title = "Form",
  fields = [],
  actionId = null,
}) {
  // 1. Build the Zod schema once per `fields` reference.
  const schema = useMemo(() => buildSchema(fields), [fields]);

  // 2. RHF setup with the dynamic resolver.
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm({ resolver: zodResolver(schema), mode: "onSubmit" });

  // 3. Read the loading/error state for this form's action.
  const actionState = useSduiStore((s) =>
    actionId != null ? s.actionStates?.[actionId] : null
  );
  const setFormData = useSduiStore((s) => s.setFormData);
  const clearFormData = useSduiStore((s) => s.clearFormData);

  // 4. Re-sync RHF defaults when the blueprint fields change.
  useEffect(() => {
    const defaults = (fields ?? []).reduce((acc, f, idx) => {
      const key = f?.name || `field_${idx}`;
      acc[key] = "";
      return acc;
    }, {});
    reset(defaults);
  }, [fields, reset]);

  // 5. Submit pipeline: snapshot → store → dispatcher.
  const onSubmit = async (values) => {
    if (id) setFormData(id, values);
    if (actionId != null) {
      await executeDynamicAction(actionId, values);
    }
  };

  const isLoading = isSubmitting || actionState?.loading === true;
  const formError = actionState?.error;

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {actionId != null && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            action #{actionId}
          </span>
        )}
      </header>

      {/* ── Action-level error banner ──────────────────────────── */}
      {formError ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800"
        >
          {formError}
        </div>
      ) : null}

      {/* ── Fields ─────────────────────────────────────────────── */}
      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">No fields configured for this form.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field, idx) => {
            const name = field?.name || `field_${idx}`;
            const inputId = `f_${id || "form"}_${name}_${idx}`;
            const error = errors?.[name]?.message;
            return (
              <div key={inputId} className="flex flex-col gap-1">
                <label htmlFor={inputId} className="text-sm font-medium text-slate-700">
                  {field?.label || name}
                  {field?.required && <span className="ml-1 text-red-600">*</span>}
                </label>
                <input
                  id={inputId}
                  type={safeInputType(field?.inputType)}
                  placeholder={field?.placeholder || ""}
                  aria-invalid={error ? "true" : "false"}
                  {...register(name)}
                  className={`w-full rounded-lg border bg-white px-3 py-2 text-sm
                              text-slate-900 placeholder-slate-400
                              focus:outline-none focus:ring-2
                              ${error
                                ? "border-red-400 focus:border-red-500 focus:ring-red-500/30"
                                : "border-slate-300 focus:border-brand-500 focus:ring-brand-500/30"}`}
                />
                {error ? (
                  <p className="mt-1 text-xs text-red-600">{error}</p>
                ) : null}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Actions ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        {id ? (
          <button
            type="button"
            onClick={() => clearFormData(id)}
            className="text-sm font-medium text-slate-500 hover:text-slate-700"
          >
            Clear
          </button>
        ) : <span />}

        <button
          type="submit"
          disabled={isLoading}
          className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm
                     font-semibold text-white shadow-sm transition
                     hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40
                     disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isLoading ? (
            <>
              <svg className="-ml-1 mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="4" />
                <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
              </svg>
              Submitting…
            </>
          ) : "Submit"}
        </button>
      </div>
    </form>
  );
}
