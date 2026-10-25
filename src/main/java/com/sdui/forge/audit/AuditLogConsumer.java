package com.sdui.forge.audit;

import com.sdui.forge.domain.ActivityLog;
import com.sdui.forge.repository.ActivityLogRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.dao.DataAccessException;
import org.springframework.kafka.annotation.KafkaListener;
import org.springframework.kafka.support.Acknowledgment;
import org.springframework.kafka.support.KafkaHeaders;
import org.springframework.messaging.handler.annotation.Header;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Kafka consumer that persists {@link ActivityLogEvent} messages to the Oracle
 * {@code ACTIVITY_LOG} table (CLOB payload column).
 *
 * <p><b>Why a background consumer?</b> The main HTTP request thread must never
 * wait for a multi-megabyte CLOB write to Oracle. Decoupling via Kafka absorbs
 * bursts and lets the consumer be scaled independently of the web tier.</p>
 *
 * <p><b>Threading model:</b> The listener container uses virtual threads (Spring
 * Boot 3.2+ + {@code spring.threads.virtual.enabled=true}). Each partition's
 * {@code concurrency} instances share a virtual-thread executor, so the I/O
 * wait on the CLOB write is essentially free in terms of platform-thread
 * occupancy.</p>
 *
 * <p><b>Failure handling:</b>
 * <ul>
 *     <li>Validation errors (null/empty event) → ack and log; do not requeue
 *         poison pills into an infinite retry loop.</li>
 *     <li>Transient DB errors → throw; the container's default
 *         {@code DefaultErrorHandler} retries with backoff and routes to a
 *         dead-letter topic after exhaustion (configured in {@code KafkaConsumerConfig}).</li>
 *     <li>Idempotent re-delivery → guarded by
 *         {@link ActivityLogRepository#findByActLogEventId(String)}.</li>
 * </ul>
 *
 * <p><b>Manual ack mode:</b> uses Spring's {@link Acknowledgment} for
 * fine-grained control — we commit the offset only after the row is durably
 * committed to Oracle.</p>
 */
@Component
public class AuditLogConsumer {

    private static final Logger log = LoggerFactory.getLogger(AuditLogConsumer.class);

    private final ActivityLogRepository activityLogRepository;

    public AuditLogConsumer(ActivityLogRepository activityLogRepository) {
        this.activityLogRepository = activityLogRepository;
    }

    /**
     * Consumes one record at a time from {@code audit-log-topic} and persists it
     * inside a single transaction. The container is configured with
     * {@code ack-mode: manual_immediate} (see {@code KafkaConsumerConfig}) so we
     * delay the offset commit until the SQL transaction commits.
     *
     * @param event     deserialized {@link ActivityLogEvent} from the topic
     * @param ack       manual ack handle — committed only on success
     * @param partition Kafka partition the record came from (for logging)
     * @param offset    record offset within the partition
     */
    @KafkaListener(
            topics = AuditLogProducer.TOPIC,
            groupId = "${spring.kafka.consumer.group-id:sdui-audit-consumer}",
            containerFactory = "auditLogListenerContainerFactory"
    )
    @Transactional
    public void consume(@Payload(required = false) ActivityLogEvent event,
                        Acknowledgment ack,
                        @Header(KafkaHeaders.RECEIVED_PARTITION) int partition,
                        @Header(KafkaHeaders.OFFSET) long offset) {

        // ── 1. Defensive validation ────────────────────────────────────────────
        if (event == null) {
            log.error("Deserialization failed or null audit event received (partition={}, offset={}) -> routing to DLQ", partition, offset);
            throw new IllegalArgumentException("Unparseable or null audit record at partition=" + partition + ", offset=" + offset);
        }
        if (event.eventId() == null || event.eventId().isBlank()) {
            log.error("Audit event missing eventId (partition={}, offset={}) -> routing to DLQ", partition, offset);
            throw new IllegalArgumentException("Audit event missing mandatory eventId at partition=" + partition + ", offset=" + offset);
        }

        try {
            // ── 2. Idempotency guard ──────────────────────────────────────────
            Optional<ActivityLog> existing = activityLogRepository.findByActLogEventId(event.eventId());
            if (existing.isPresent()) {
                log.debug("Duplicate audit event skipped: eventId={}", event.eventId());
                ack.acknowledge();
                return;
            }

            // ── 3. Persist to Oracle CLOB ─────────────────────────────────────
            ActivityLog row = new ActivityLog(
                    null, // identity column
                    event.eventId(),
                    event.userId(),
                    event.action(),
                    event.referenceKey(),
                    event.payload(),
                    event.sourceIp(),
                    event.timestamp() != null ? event.timestamp() : java.time.Instant.now()
            );
            activityLogRepository.save(row);

            // ── 4. Acknowledge AFTER successful commit ────────────────────────
            ack.acknowledge();
            log.debug("Audit event persisted: eventId={}, user={}, action={} (partition={}, offset={})",
                    event.eventId(), event.userId(), event.action(), partition, offset);

        } catch (DataAccessException dae) {
            // Transient DB error — let the container retry/DLQ handle it.
            log.error("Database error persisting audit event eventId={} — will retry. Cause: {}",
                    event.eventId(), dae.getMostSpecificCause().getMessage(), dae);
            throw dae;
        } catch (RuntimeException ex) {
            // Unexpected — log full stack and rethrow so the error handler routes
            // the record to the DLQ rather than silently dropping it.
            log.error("Unexpected error persisting audit event eventId={} — routing to DLQ",
                    event.eventId(), ex);
            throw ex;
        }
    }
}
