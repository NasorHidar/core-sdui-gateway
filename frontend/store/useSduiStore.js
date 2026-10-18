/**
 * useSduiStore (Zustand)
 * --------------------------------------------------------------------
 * Central client-side state for the SDUI engine. Manages two domains:
 *
 *   1. formData   — ephemeral form field values (keyed by form ID → field map).
 *                   Populated by SkeletonForm on change, consumed by the
 *                   Action Dispatcher on submit.
 *
 *   2. widgetData — API response payloads keyed by target widget ID.
 *                   The Action Dispatcher writes here after a successful
 *                   API call; SkeletonGrid (and future data-bound widgets)
 *                   subscribe to their own slice via selector.
 *
 * Design notes:
 *   - Flat single-store: banking pages rarely exceed a dozen widgets,
 *     so a single store with shallow selectors is optimal.
 *   - All setters are immutable (spread + replace), never mutate-in-place.
 *   - Optional chaining on reads is enforced at the consumer level,
 *     but the store initialises both maps as `{}` to guarantee a base shape.
 */

import { create } from "zustand";

const useSduiStore = create((set) => ({
  // ─── Form Data ──────────────────────────────────────────────────────
  // Shape: { [formId]: { [fieldName]: value } }
  formData: {},

  /**
   * Sets a single field value under a form scope.
   * @param {string} formId   - The blueprint-level form ID (e.g. "search_form_1").
   * @param {string} field    - The field name from the fields[] array.
   * @param {*}      value    - Current input value.
   */
  setFieldValue: (formId, field, value) =>
    set((state) => ({
      formData: {
        ...state.formData,
        [formId]: {
          ...(state.formData?.[formId] ?? {}),
          [field]: value,
        },
      },
    })),

  /**
   * Bulk-replaces all field values for a form (e.g. on reset or
   * when React Hook Form's getValues() provides a snapshot).
   * @param {string} formId - Form scope key.
   * @param {Object} data   - Full field-value map.
   */
  setFormData: (formId, data) =>
    set((state) => ({
      formData: {
        ...state.formData,
        [formId]: data ?? {},
      },
    })),

  /**
   * Clears form data for a specific form (e.g. after successful submit).
   * @param {string} formId - Form scope key to clear.
   */
  clearFormData: (formId) =>
    set((state) => {
      const next = { ...state.formData };
      delete next[formId];
      return { formData: next };
    }),

  // ─── Widget Data ────────────────────────────────────────────────────
  // Shape: { [widgetId]: any (typically Array | Object from API response) }
  widgetData: {},

  /**
   * Stores an API response payload under a widget ID.
   * Called by the Action Dispatcher after a successful fetch.
   * @param {string} widgetId - The targetWidget from PAGE_ACTION metadata.
   * @param {*}      data     - The API response payload (array, object, etc.).
   */
  setWidgetData: (widgetId, data) =>
    set((state) => ({
      widgetData: {
        ...state.widgetData,
        [widgetId]: data,
      },
    })),

  /**
   * Clears data for a specific widget (e.g. before a new search).
   * @param {string} widgetId - Widget scope key to clear.
   */
  clearWidgetData: (widgetId) =>
    set((state) => {
      const next = { ...state.widgetData };
      delete next[widgetId];
      return { widgetData: next };
    }),

  // ─── Loading & Error State ──────────────────────────────────────────
  // Shape: { [actionId]: { loading: bool, error: string|null } }
  actionStates: {},

  /**
   * Sets the loading/error state for a given action.
   * @param {number|string} actionId
   * @param {{ loading?: boolean, error?: string|null }} state
   */
  setActionState: (actionId, actionState) =>
    set((state) => ({
      actionStates: {
        ...state.actionStates,
        [actionId]: {
          ...(state.actionStates?.[actionId] ?? {}),
          ...actionState,
        },
      },
    })),
}));

export default useSduiStore;
