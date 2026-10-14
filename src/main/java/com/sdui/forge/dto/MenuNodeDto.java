package com.sdui.forge.dto;

import java.util.List;

/**
 * DTO representing a single node in the hierarchical menu tree.
 *
 * <p>Constructed in the service layer by grouping flat {@code ServiceDetails}
 * rows by their parent-child relationships. The {@code children} list
 * is recursively populated.</p>
 *
 * @param menuId       unique menu node identifier
 * @param menuName     display name
 * @param pageId       linked page template (nullable for container nodes)
 * @param allowedRoles comma-separated role list for frontend ACL filtering
 * @param children     child menu nodes (empty list for leaf nodes)
 */
public record MenuNodeDto(
        Long menuId,
        String menuName,
        Long pageId,
        String allowedRoles,
        List<MenuNodeDto> children
) {
}
