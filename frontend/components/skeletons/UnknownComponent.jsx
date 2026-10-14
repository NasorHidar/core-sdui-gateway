/**
 * UnknownComponent
 * --------------------------------------------------------------------
 * Fallback rendered by the registry when a `type` from the blueprint
 * is not (yet) mapped. Visible in dev so misconfigurations are obvious;
 * keeps the page alive so a single bad node cannot white-screen the UI.
 *
 * Receives the original raw node so engineers can inspect what came
 * from the backend.
 */

export default function UnknownComponent({ type, node }) {
  // Defensive: only log the type, not the full node (may contain PII).
  if (typeof console !== "undefined" && console.warn) {
    console.warn(`[SDUI] Unregistered component type: ${type ?? "(missing)"}`);
  }

  return (
    <div
      role="alert"
      className="rounded-xl border border-dashed border-amber-300 bg-amber-50 p-4 text-sm text-amber-900"
    >
      <p className="font-semibold">Unknown component</p>
      <p className="mt-1">
        The backend requested a component of type
        <code className="mx-1 rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
          {String(type ?? "(missing)")}
        </code>
        which is not registered. Ask the SDUI team to add it to the registry.
      </p>
    </div>
  );
}
