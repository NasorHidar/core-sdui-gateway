package com.sdui.forge.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Domain entity mapped to {@code SERVICE_DETAILS}.
 *
 * <p>Represents a single node in the hierarchical menu tree.
 * Parent-child relationships are resolved via {@code svrdParentMenuId}
 * using a recursive query in the repository layer — not through
 * object-graph navigation (no JPA, no lazy loading).</p>
 */
@Table("SERVICE_DETAILS")
public record ServiceDetails(

        @Id
        @Column("SVRD_MENU_ID")
        Long svrdMenuId,

        @Column("SVR_ID")
        Long svrId,

        @Column("SVRD_PARENT_MENU_ID")
        Long svrdParentMenuId,

        @Column("SVRD_MENU_NAME")
        String svrdMenuName,

        @Column("SVRD_ALLOWED_ROLES")
        String svrdAllowedRoles,

        @Column("SVRD_PAGE_ID")
        Long svrdPageId,

        @Column("SVRD_IS_ACTIVE")
        Integer svrdIsActive
) {
}
