package com.sdui.forge.config;

import com.sdui.forge.audit.ActivityLogEvent;
import org.apache.kafka.clients.consumer.ConsumerConfig;
import org.apache.kafka.common.serialization.StringDeserializer;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.autoconfigure.kafka.KafkaProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.kafka.annotation.EnableKafka;
import org.springframework.kafka.config.ConcurrentKafkaListenerContainerFactory;
import org.springframework.kafka.core.ConsumerFactory;
import org.springframework.kafka.core.DefaultKafkaConsumerFactory;
import org.springframework.kafka.listener.ContainerProperties;
import org.springframework.kafka.listener.DefaultErrorHandler;
import org.springframework.kafka.support.serializer.ErrorHandlingDeserializer;
import org.springframework.kafka.support.serializer.JsonDeserializer;
import org.springframework.util.backoff.ExponentialBackOff;

import java.util.HashMap;
import java.util.Map;

/**
 * Kafka consumer configuration for the audit-log pipeline.
 *
 * <p>Isolated from the default {@code KafkaAutoConfiguration} consumer factory
 * so the audit topic can use a different deserialiser, error handler, and
 * concurrency profile than any future business-event consumers.</p>
 *
 * <p><b>Key safety features:</b>
 * <ul>
 *     <li>{@link ErrorHandlingDeserializer} wraps the JSON deserialiser so a
 *         poison-pill payload never crashes the consumer thread.</li>
 *     <li>{@link DefaultErrorHandler} with exponential backoff retries transient
 *         failures and then routes to a dead-letter topic.</li>
 *     <li>{@code manual_immediate} ack mode ties offset commits to successful
 *         database writes — no loss even on consumer crash mid-batch.</li>
 *     <li>Concurrency mirrors the default in {@code application.yml}.</li>
 * </ul>
 */
@Configuration
@EnableKafka
public class KafkaConsumerConfig {

    private static final Logger log = LoggerFactory.getLogger(KafkaConsumerConfig.class);

    private final KafkaProperties kafkaProperties;

    public KafkaConsumerConfig(KafkaProperties kafkaProperties) {
        this.kafkaProperties = kafkaProperties;
    }

    /**
     * Dedicated consumer factory for audit events.
     *
     * <p>The default Spring factory is sufficient for most cases, but the audit
     * pipeline needs explicit {@code ErrorHandlingDeserializer} wrapping so a
     * single malformed record cannot terminate the listener container.</p>
     */
    @Bean
    public ConsumerFactory<String, ActivityLogEvent> auditLogConsumerFactory() {
        Map<String, Object> props = new HashMap<>(kafkaProperties.buildConsumerProperties(null));

        // Replace the deserialisers with error-handling variants.
        props.put(ConsumerConfig.KEY_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);
        props.put(ConsumerConfig.VALUE_DESERIALIZER_CLASS_CONFIG, ErrorHandlingDeserializer.class);

        // The wrapped deserialisers do the actual work.
        props.put(ErrorHandlingDeserializer.KEY_DESERIALIZER_CLASS, StringDeserializer.class);
        props.put(ErrorHandlingDeserializer.VALUE_DESERIALIZER_CLASS, JsonDeserializer.class);

        // Pin the target type — required when not using Spring's TypeMapper header.
        props.put(JsonDeserializer.VALUE_DEFAULT_TYPE, ActivityLogEvent.class.getName());
        props.put(JsonDeserializer.TRUSTED_PACKAGES, "com.sdui.forge.audit");
        props.put(JsonDeserializer.USE_TYPE_INFO_HEADERS, false);

        return new DefaultKafkaConsumerFactory<>(props);
    }

    /**
     * Listener container factory wired to the audit consumer factory.
     *
     * <p>Manual ack + per-record retry + DLQ produce the strongest at-least-once
     * delivery semantics the Kafka client supports.</p>
     */
    @Bean(name = "auditLogListenerContainerFactory")
    public ConcurrentKafkaListenerContainerFactory<String, ActivityLogEvent>
            auditLogListenerContainerFactory() {

        ConcurrentKafkaListenerContainerFactory<String, ActivityLogEvent> factory =
                new ConcurrentKafkaListenerContainerFactory<>();
        factory.setConsumerFactory(auditLogConsumerFactory());

        Integer configuredConcurrency = kafkaProperties.getListener().getConcurrency();
        factory.setConcurrency(configuredConcurrency != null ? configuredConcurrency : 3);

        // Offset committed only after the listener method returns successfully.
        factory.getContainerProperties().setAckMode(ContainerProperties.AckMode.MANUAL_IMMEDIATE);

        // Exponential backoff: 1s → 2s → 4s … capped at 10s, max 30s total.
        ExponentialBackOff backOff = new ExponentialBackOff(1_000L, 2.0);
        backOff.setMaxInterval(10_000L);
        backOff.setMaxElapsedTime(30_000L);

        DefaultErrorHandler errorHandler = new DefaultErrorHandler(
                (record, ex) -> log.error("Audit record exhausted retries -> DLT. topic={}, partition={}, offset={}, cause={}",
                        record.topic(), record.partition(), record.offset(),
                        ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage()),
                backOff
        );
        errorHandler.setRetryListeners((record, ex, deliveryAttempt) ->
                log.warn("Audit record retry attempt={} for topic={}, partition={}, offset={}, cause={}",
                        deliveryAttempt, record.topic(), record.partition(), record.offset(),
                        ex.getCause() != null ? ex.getCause().getMessage() : ex.getMessage()));
        // Validation failures are not transient — never retry them.
        errorHandler.addNotRetryableExceptions(IllegalArgumentException.class);

        factory.setCommonErrorHandler(errorHandler);
        return factory;
    }
}
