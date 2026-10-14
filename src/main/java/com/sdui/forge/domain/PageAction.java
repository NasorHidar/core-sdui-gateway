package com.sdui.forge.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Domain entity mapped to {@code PAGE_ACTION}.
 *
 * <p>Defines an executable action (API call, navigation, widget mutation)
 * available on a page. Linked to the menu tree via {@code svrdMenuId}.</p>
 *
 * <p>The {@code actJsonSchema} is stored as Oracle native {@code JSON} and
 * surfaced here as a raw JSON {@code String} for zero-copy passthrough
 * to the SDUI frontend engine.</p>
 */
@Table("PAGE_ACTION")
public record PageAction(

        @Id
        @Column("ACT_ID")
        Long actId,

        @Column("SVRD_MENU_ID")
        Long svrdMenuId,

        @Column("ACT_NAME")
        String actName,

        @Column("ACT_TYPE")
        String actType,

        @Column("ACT_HTTP_METHOD")
        String actHttpMethod,

        @Column("ACT_TARGET_ENDPOINT")
        String actTargetEndpoint,

        @Column("ACT_TARGET_WIDGET")
        String actTargetWidget,

        @Column("ACT_JSON_SCHEMA")
        String actJsonSchema
) {
}
