import DisplayCard from "./DisplayCard";
import InputGroup from "./InputGroup";
import ActionButton from "./ActionButton";
import { resolve as resolveFromComponentRegistry } from "@/utils/componentRegistry";

/**
 * Canonical registry of 100% dynamic SDUI widgets.
 * Allows case-insensitive / naming variant lookups.
 */
export const WIDGET_REGISTRY = {
  Display_Card: DisplayCard,
  DisplayCard: DisplayCard,
  DISPLAY_CARD: DisplayCard,

  Input_Group: InputGroup,
  InputGroup: InputGroup,
  INPUT_GROUP: InputGroup,

  Action_Button: ActionButton,
  ActionButton: ActionButton,
  ACTION_BUTTON: ActionButton,
};

/**
 * Resolves a dynamic widget component by its string identifier.
 * First checks dynamic widgets, then falls back to global component registry.
 *
 * @param {string} widgetType - e.g., "Display_Card", "Input_Group", "Action_Button".
 * @returns {React.ComponentType|null}
 */
export function resolveWidget(widgetType) {
  if (typeof widgetType !== "string" || !widgetType) return null;
  if (WIDGET_REGISTRY[widgetType]) return WIDGET_REGISTRY[widgetType];
  return resolveFromComponentRegistry(widgetType);
}

export { DisplayCard, InputGroup, ActionButton };

