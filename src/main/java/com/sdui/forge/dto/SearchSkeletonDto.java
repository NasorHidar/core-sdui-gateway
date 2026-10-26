package com.sdui.forge.dto;

import java.util.List;

/**
 * DTO representing the dynamic Search Box UI Skeleton and its validation rules.
 *
 * <p>Transmitted to the frontend when a menu item is selected to dynamically
 * generate search fields (0, 1, or multiple) and enforce client-side validation
 * before dispatching requests to the backend.</p>
 *
 * @param pageId         target page ID
 * @param title          header title for the search box
 * @param subtitle       contextual guidance for user
 * @param icon           display icon / emoji
 * @param requiresSearch if false or fields is empty, triggers Smart Bypass
 * @param submitLabel    text for the primary search button
 * @param fields         dynamic list of search input fields (0, 1, or multiple)
 */
public record SearchSkeletonDto(
        Long pageId,
        String title,
        String subtitle,
        String icon,
        boolean requiresSearch,
        String submitLabel,
        List<SearchFieldDto> fields
) {
    public record SearchFieldDto(
            String name,
            String label,
            String inputType,
            boolean required,
            String placeholder,
            String defaultValue,
            List<SelectOptionDto> options,
            ValidationRuleDto validation
    ) {
    }

    public record SelectOptionDto(
            String value,
            String label
    ) {
    }

    public record ValidationRuleDto(
            String pattern,
            Integer minLength,
            Integer maxLength,
            Double min,
            Double max,
            String message
    ) {
    }
}
