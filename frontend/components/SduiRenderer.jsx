"use client";

/**
 * SduiRenderer
 * --------------------------------------------------------------------
 * The core SDUI engine. Accepts a `components` array from a blueprint
 * and recursively mounts React components by looking up each node's
 * `type` in the registry.
 *
 * Blueprint contract (per phase-1 spec example):
 *   {
 *     "pageTitle":   "Customer Dashboard",
 *     "layoutType":  "VERTICAL_STACK",
 *     "components":  [ { type, id, props, children? }, ... ]
 *   }
 *
 * Defensive design (JS, no TS):
 *   - Always treats `components` as an array (coerces non-arrays to []).
 *   - Skips null/undefined entries silently.
 *   - Uses backend-supplied `id` as the React key for stable reconciliation.
 *   - Falls back to `type+index` if `id` is missing.
 *   - Recurses into a node's own `children` array if present, so nested
 *     layouts (e.g. rows inside a column) work without a second pass.
 */

import { resolve } from "@/utils/componentRegistry";

/**
 * Compute a stable, unique React key for a node. The backend `id` is
 * the preferred key because it is stable across re-renders; if the
 * backend omits it we synthesise a key from the type and index so the
 * list still mounts.
 */
function nodeKey(node, index) {
  if (node && typeof node.id === "string" && node.id.length > 0) return node.id;
  const t = typeof node?.type === "string" ? node.type : "node";
  return `${t}_${index}`;
}

/**
 * Render a single node (and any of its own children, recursively).
 * Kept as a named function so it can call itself without a ref to `this`.
 */
function renderNode(node, index) {
  if (!node || typeof node !== "object") return null;

  const { type, id: nodeId, props = {}, children } = node;
  const Component = resolve(type);
  const key = nodeKey(node, index);

  // Phase 3: pass the blueprint node's `id` as a prop so data-bound
  // components (SkeletonForm, SkeletonGrid) can scope their state.
  const mergedProps = { ...props, ...(nodeId ? { id: nodeId } : {}) };

  // If the node itself contains children, recurse and pass them down via
  // a `children` prop. This keeps the engine future-proof for container
  // layouts without changing the public surface of leaf components.
  const childArray = Array.isArray(children) ? children : null;

  if (childArray) {
    return (
      <Component key={key} {...mergedProps}>
        {childArray.map((child, i) => renderNode(child, i))}
      </Component>
    );
  }

  return <Component key={key} {...mergedProps} />;
}

/**
 * Top-level renderer. Picks a layout wrapper from `layoutType` and
 * maps over the `components` array. Returns a fragment so the caller
 * can compose it inside any page chrome.
 */
export default function SduiRenderer({ blueprint }) {
  // Defensive: anything non-array becomes an empty list. We never throw
  // on a malformed payload — the page just renders empty.
  const safeBlueprint = blueprint && typeof blueprint === "object" ? blueprint : {};
  const nodes = Array.isArray(safeBlueprint.components) ? safeBlueprint.components : [];

  if (nodes.length === 0) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
        This page has no UI components to render.
      </div>
    );
  }

  const rendered = nodes.map((node, i) => renderNode(node, i));

  // Pick a layout wrapper. New layout types can be added without
  // touching the renderer body — just add a case below.
  switch (safeBlueprint.layoutType) {
    case "HORIZONTAL_STACK":
      return (
        <div className="flex flex-col gap-4 md:flex-row md:items-stretch">
          {rendered}
        </div>
      );
    case "GRID":
      return (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
          {rendered}
        </div>
      );
    case "VERTICAL_STACK":
    default:
      return <div className="flex flex-col gap-4">{rendered}</div>;
  }
}
