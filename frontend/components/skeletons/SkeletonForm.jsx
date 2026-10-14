"use client";

/**
 * SkeletonForm
 * --------------------------------------------------------------------
 * Dynamic form driven by a `fields[]` array from the SDUI blueprint.
 * Kept intentionally simple — React Hook Form + Zod will replace the
 * internal state in Phase 3. The public prop surface is stable so
 * the upgrade is drop-in.
 *
 * Blueprint contract:
 *   {
 *     "type": "Skeleton_Form",
 *     "id":   "search_form_1",
 *     "props": {
 *       "title":   "Search",
 *       "fields":  [{ "name", "label", "inputType", "required", "placeholder" }],
 *       "actionId": 101
 *     }
 *   }
 */

import { useState } from "react";

// Defensive input-type whitelist. Anything outside this set falls back to "text"
// so a malicious or buggy backend cannot inject uncontrolled input variants.
const ALLOWED_INPUT_TYPES = new Set([
  "text", "email", "password", "number", "tel", "url", "search", "date",
]);

function safeInputType(raw) {
  return ALLOWED_INPUT_TYPES.has(raw) ? raw : "text";
}

export default function SkeletonForm({ title = "Form", fields = [], actionId = null, onSubmit }) {
  // Build an initial values object from the field list. If a field is missing
  // a `name`, we synthesize one so React can still track it.
  const initialValues = fields.reduce((acc, f, idx) => {
    const key = f?.name || `field_${idx}`;
    acc[key] = "";
    return acc;
  }, {});
  const [values, setValues] = useState(initialValues);

  const handleChange = (name) => (e) => {
    const next = e?.target?.value ?? "";
    setValues((prev) => ({ ...prev, [name]: next }));
  };

  const handleSubmit = (e) => {
    e?.preventDefault?.();
    if (typeof onSubmit === "function") {
      onSubmit({ actionId, values });
    }
    // Phase 3 will wire actionId → PageAction lookup → API call here.
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
    >
      <header className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
        {actionId != null && (
          <span className="rounded-full bg-brand-50 px-2.5 py-0.5 text-xs font-medium text-brand-700">
            action #{actionId}
          </span>
        )}
      </header>

      {fields.length === 0 ? (
        <p className="text-sm text-slate-500">No fields configured for this form.</p>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {fields.map((field, idx) => {
            const name = field?.name || `field_${idx}`;
            const id = `f_${name}_${idx}`;
            return (
              <div key={id} className="flex flex-col gap-1">
                <label htmlFor={id} className="text-sm font-medium text-slate-700">
                  {field?.label || name}
                  {field?.required && <span className="ml-1 text-red-600">*</span>}
                </label>
                <input
                  id={id}
                  name={name}
                  type={safeInputType(field?.inputType)}
                  required={!!field?.required}
                  placeholder={field?.placeholder || ""}
                  value={values[name] ?? ""}
                  onChange={handleChange(name)}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm
                             text-slate-900 placeholder-slate-400
                             focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            );
          })}
        </div>
      )}

      <div className="flex justify-end">
        <button
          type="submit"
          className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm
                     font-semibold text-white shadow-sm transition
                     hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500/40"
        >
          Submit
        </button>
      </div>
    </form>
  );
}
