package com.sdui.forge.domain;

import org.springframework.data.annotation.Id;
import org.springframework.data.relational.core.mapping.Column;
import org.springframework.data.relational.core.mapping.Table;

import java.time.Instant;

/**
 * Domain entity mapped to {@code ACTIVITY_LOG}.
 *
 * <p>Captures the full JSON payload (CLOB) of every business transaction that
 * flows through the SDUI gateway. Written asynchronously by
 * {@link com.sdui.forge.audit.AuditLogConsumer} from the Kafka
 * {@code audit-log-topic}.</p>
 *
 * <p>The {@code payload} column is intentionally a {@code String} here and the
 * underlying column is a CLOB. Spring Data JDBC binds it via {@code setCharacterStream}
 * to avoid materialising multi-megabyte payloads in JVM heap before the round-trip.</p>
 */
@Table("ACTIVITY_LOG")
public record ActivityLog(

        @Id
        @Column("ACT_LOG_ID")
        Long actLogId,

        @Column("ACT_LOG_EVENT_ID")
        String actLogEventId,

        @Column("ACT_LOG_USER_ID")
        String actLogUserId,

        @Column("ACT_LOG_ACTION")
        String actLogAction,

        @Column("ACT_LOG_REFERENCE_KEY")
        String actLogReferenceKey,

        @Column("ACT_LOG_PAYLOAD")
        String actLogPayload,

        @Column("ACT_LOG_SOURCE_IP")
        String actLogSourceIp,

        @Column("ACT_LOG_CREATED_AT")
        Instant actLogCreatedAt
) {
}
