package com.sdui.forge.audit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.kafka.core.KafkaTemplate;
import org.springframework.kafka.support.SendResult;
import org.springframework.stereotype.Service;

import java.util.concurrent.CompletableFuture;

/**
 * Kafka producer service for asynchronous audit logging.
 *
 * <p>Publishes {@link ActivityLogEvent} messages to the {@code audit-log-topic}
 * Kafka topic. The send is fully non-blocking — the main request thread is never
 * blocked waiting for Oracle CLOB writes.</p>
 *
 * <p>Thread-safe: the underlying {@link KafkaTemplate} is thread-safe and
 * manages its own producer pool. Safe for concurrent virtual thread usage.</p>
 *
 * <p><b>Ordering guarantee:</b> Messages are partitioned by {@code userId}
 * so that all audit events for a given user are ordered within their partition.</p>
 */
@Service
public class AuditLogProducer {

    private static final Logger log = LoggerFactory.getLogger(AuditLogProducer.class);

    /** Topic name — matches the consumer's @KafkaListener topic. */
    public static final String TOPIC = "audit-log-topic";

    private final KafkaTemplate<String, ActivityLogEvent> kafkaTemplate;

    public AuditLogProducer(KafkaTemplate<String, ActivityLogEvent> kafkaTemplate) {
        this.kafkaTemplate = kafkaTemplate;
    }

    /**
     * Publishes an audit event to Kafka asynchronously.
     *
     * <p>The key is set to {@code userId} to ensure per-user ordering.
     * A callback logs success/failure without blocking the caller.</p>
     *
     * @param event the audit event to publish
     */
    public void publish(ActivityLogEvent event) {
        if (event == null) {
            log.warn("Attempted to publish null audit event — skipped");
            return;
        }

        log.debug("Publishing audit event: eventId={}, action={}, user={}",
                event.eventId(), event.action(), event.userId());

        CompletableFuture<SendResult<String, ActivityLogEvent>> future =
                kafkaTemplate.send(TOPIC, event.userId(), event);

        future.whenComplete((result, ex) -> {
            if (ex != null) {
                // Log and alert — do NOT rethrow to avoid disrupting the main request.
                // In production, wire this to a dead-letter queue or alerting system.
                log.error("Failed to publish audit event: eventId={}, error={}",
                        event.eventId(), ex.getMessage(), ex);
            } else {
                log.debug("Audit event published: eventId={}, partition={}, offset={}",
                        event.eventId(),
                        result.getRecordMetadata().partition(),
                        result.getRecordMetadata().offset());
            }
        });
    }
}
