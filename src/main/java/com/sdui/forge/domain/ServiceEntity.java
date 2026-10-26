package com.sdui.forge.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

/**
 * Domain entity mapped to the primary {@code SERVICE} table in Oracle 23ai.
 *
 * <p>Represents a top-level banking business domain (e.g., Retail Core Banking,
 * Cards & Electronic Payments, Lending & Credit Facilities).</p>
 */
@Table("SERVICE")
public record ServiceEntity(

        @Id
        @Column("SVR_ID")
        Long svrId,

        @Column("SVR_NAME")
        String svrName,

        @Column("SVR_ICON_URL")
        String svrIconUrl,

        @Column("SVR_BASE_API_URL")
        String svrBaseApiUrl,

        @Column("SVR_IS_ACTIVE")
        Integer svrIsActive,

        @Column("SVR_SORT_ORDER")
        Integer svrSortOrder
) {
}
