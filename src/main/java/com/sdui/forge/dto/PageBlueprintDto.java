package com.sdui.forge.dto;

import java.util.List;

/**
 * DTO representing the complete SDUI page configuration.
 *
 * <p>This is the primary response payload consumed by the frontend
 * rendering engine. It bundles:</p>
 * <ul>
 *     <li>The page metadata (title, layout, version)</li>
 *     <li>The raw JSON blueprint (passed through as-is for the SDUI engine)</li>
 *     <li>All actions available on this page</li>
 * </ul>
 *
 * @param pageId        unique page identifier
 * @param pageTitle     human-readable title
 * @param layoutType    layout strategy (FORM, LIST, DASHBOARD, etc.)
 * @param pageVersion   semantic version for cache-busting
 * @param uiBlueprint   raw JSON blueprint — the frontend engine's primary input
 * @param actions       list of actions bound to this page
 */
public record PageBlueprintDto(
        Long pageId,
        String pageTitle,
        String layoutType,
        String pageVersion,
        Object uiBlueprint,
        List<ActionDto> actions
) {

    /**
     * Action DTO — flattened view of {@code PageAction} for API response.
     */
    public record ActionDto(
            Long actionId,
            String actionName,
            String actionType,
            String httpMethod,
            String targetEndpoint,
            String targetWidget,
            Object jsonSchema
    ) {
    }
}
