/**
 * componentRegistry
 * --------------------------------------------------------------------
 * String → React component map. The renderer only ever sees the string
 * `type` from the JSON blueprint; this file is the single point where
 * that string becomes a real component.
 *
 * Adding a new component in a later phase:
 *   1. Build the component under components/skeletons/
 *   2. Import it here
 *   3. Add an entry to REGISTRY below
 *
 * Lookup is O(1) via a plain object map. resolve() is the only public
 * surface — it never throws, it always returns a renderable component.
 */

import SkeletonCard from "@/components/skeletons/SkeletonCard";
import SkeletonForm from "@/components/skeletons/SkeletonForm";
import SkeletonGrid from "@/components/skeletons/SkeletonGrid";
import UnknownComponent from "@/components/skeletons/UnknownComponent";

/**
 * The registry itself. Keys MUST match the `type` strings the backend
 * sends in PAGE_TEMPLATE.PAGE_UI_BLUEPRINT.
 */
const REGISTRY = {
  Skeleton_Card: SkeletonCard,
  Skeleton_Form: SkeletonForm,
  Skeleton_Grid: SkeletonGrid,
};

/**
 * Returns the component registered for `type`, or the fallback if the
 * type is missing/unknown. Never throws.
 *
 * @param {string} type - The component type identifier from the blueprint.
 * @returns {React.ComponentType} A renderable component.
 */
export function resolve(type) {
  if (typeof type !== "string" || type.length === 0) return UnknownComponent;
  return REGISTRY[type] || UnknownComponent;
}

/**
 * Convenience for tools / docs. Exposes the set of known type names
 * without leaking the component map itself.
 */
export function knownTypes() {
  return Object.keys(REGISTRY);
}
