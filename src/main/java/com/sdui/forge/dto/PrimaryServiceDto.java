package com.sdui.forge.dto;

import java.util.List;

/**
 * DTO representing a primary banking service fetched from the {@code SERVICE} table,
 * enriched with its child sub-services and display sort order.
 */
public record PrimaryServiceDto(
        Long id,
        String name,
        String iconUrl,
        String baseApiUrl,
        Integer isActive,
        Integer sortOrder,
        List<MenuNodeDto> children
) {
}
