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
import DisplayCard from "@/components/widgets/DisplayCard";
import InputGroup from "@/components/widgets/InputGroup";
import ActionButton from "@/components/widgets/ActionButton";

/**
 * The registry itself. Keys MUST match the `type` or `widgetType` strings the backend
 * sends in PAGE_TEMPLATE.PAGE_UI_BLUEPRINT.
 */
const REGISTRY = {
  Skeleton_Card:         SkeletonCard,
  SkeletonCard:          SkeletonCard,
  ACCOUNT_SUMMARY_CARD:  SkeletonCard,
  Skeleton_Form:         SkeletonForm,
  SkeletonForm:          SkeletonForm,
  ACCOUNT_LOOKUP_FORM:   SkeletonForm,
  Skeleton_Grid:         SkeletonGrid,
  SkeletonGrid:          SkeletonGrid,

  // 100% Dynamic JSON UI Widgets
  Display_Card:          DisplayCard,
  DisplayCard:           DisplayCard,
  DISPLAY_CARD:          DisplayCard,
  Input_Group:           InputGroup,
  InputGroup:            InputGroup,
  INPUT_GROUP:           InputGroup,
  Action_Button:         ActionButton,
  ActionButton:          ActionButton,
  ACTION_BUTTON:         ActionButton,
};

/**
 * Returns the component registered for `type`, or the fallback if the
 * type is missing/unknown. Never throws.
 *
 * @param {string} type - The component type identifier from the blueprint.
 * @returns {React.ComponentType} A renderable component.
 */
export function resolve(type) {
  if (typeof type !== "string" || type.trim().length === 0) return UnknownComponent;
  const clean = type.trim();
  if (REGISTRY[clean]) return REGISTRY[clean];

  // Case-insensitive fallback
  const cleanLower = clean.toLowerCase();
  const matchedKey = Object.keys(REGISTRY).find((k) => k.toLowerCase() === cleanLower);
  if (matchedKey) return REGISTRY[matchedKey];

  return UnknownComponent;
}

/**
 * Convenience for tools / docs. Exposes the set of known type names
 * without leaking the component map itself.
 */
export function knownTypes() {
  return Object.keys(REGISTRY);
}
