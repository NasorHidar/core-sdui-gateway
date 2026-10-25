package com.sdui.forge.audit;

import com.fasterxml.jackson.annotation.JsonCreator;
import com.fasterxml.jackson.annotation.JsonProperty;

import java.io.Serializable;
import java.time.Instant;
import java.util.UUID;

/**
 * Immutable event payload published to the Kafka {@code audit-log-topic}.
 *
 * <p>Captures every business transaction that occurs through the SDUI gateway.
 * The consumer persists this to Oracle's {@code ACTIVITY_LOG} table with its
 * CLOB payload column.</p>
 *
 * <p>Implements {@link Serializable} for Kafka JSON serialization compatibility.
 * Uses Jackson annotations for explicit deserialization mapping.</p>
 *
 * @param eventId      unique event identifier (UUID) for idempotent processing
 * @param userId       the authenticated user who triggered the action
 * @param action       business action name (e.g., "ACCOUNT_SEARCH", "TRANSFER")
 * @param referenceKey business reference (e.g., account number, transaction ID)
 * @param payload      full JSON payload (request body, response excerpt, etc.)
 * @param sourceIp     originating client IP address
 * @param timestamp    event creation timestamp (ISO-8601)
 */
public record ActivityLogEvent(
        String eventId,
        String userId,
        String action,
        String referenceKey,
        String payload,
        String sourceIp,
        Instant timestamp
) implements Serializable {

    /**
     * Jackson-compatible factory constructor.
     */
    @JsonCreator
    public ActivityLogEvent(
            @JsonProperty("eventId") String eventId,
            @JsonProperty("userId") String userId,
            @JsonProperty("action") String action,
            @JsonProperty("referenceKey") String referenceKey,
            @JsonProperty("payload") String payload,
            @JsonProperty("sourceIp") String sourceIp,
            @JsonProperty("timestamp") Instant timestamp) {
        this.eventId = eventId;
        this.userId = userId;
        this.action = action;
        this.referenceKey = referenceKey;
        this.payload = payload;
        this.sourceIp = sourceIp;
        this.timestamp = timestamp;
    }

    /**
     * Convenience factory — auto-generates eventId and timestamp.
     */
    public static ActivityLogEvent create(String userId, String action,
                                          String referenceKey, String payload,
                                          String sourceIp) {
        return new ActivityLogEvent(
                UUID.randomUUID().toString(),
                userId,
                action,
                referenceKey,
                payload,
                sourceIp,
                Instant.now()
        );
    }
}
