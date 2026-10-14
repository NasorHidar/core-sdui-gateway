package com.sdui.forge.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Domain entity mapped to {@code PAGE_TEMPLATE}.
 *
 * <p>The {@code pageUiBlueprint} field maps to an Oracle {@code JSON} column.
 * Spring Data JDBC reads it as a {@code String} (textual JSON).
 * A custom {@link com.sdui.forge.config.JdbcConfig} converter handles
 * Oracle's OSON binary format ↔ String conversion transparently.</p>
 */
@Table("PAGE_TEMPLATE")
public record PageTemplate(

        @Id
        @Column("PAGE_ID")
        Long pageId,

        @Column("PAGE_TITLE")
        String pageTitle,

        @Column("PAGE_LAYOUT_TYPE")
        String pageLayoutType,

        @Column("PAGE_UI_BLUEPRINT")
        String pageUiBlueprint,

        @Column("PAGE_VERSION")
        String pageVersion
) {
}
