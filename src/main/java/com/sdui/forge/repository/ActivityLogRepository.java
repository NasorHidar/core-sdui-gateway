package com.sdui.forge.repository;

import com.sdui.forge.domain.ActivityLog;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

/**
 * Repository for {@link ActivityLog}.
 *
 * <p>Inherits standard CRUD from {@link CrudRepository}; the {@code JdbcRepository}
 * variant gives access to {@link org.springframework.data.jdbc.core.JdbcTemplate}-backed
 * bulk operations for high-throughput audit ingestion.</p>
 *
 * <p>Idempotency: the consumer checks {@link #findByActLogEventId(String)} before
 * insert, so a redelivered Kafka record never produces a duplicate row.</p>
 */
@Repository
public interface ActivityLogRepository
        extends CrudRepository<ActivityLog, Long> {

    /**
     * Looks up an audit row by its unique event id (set by the producer).
     *
     * @param actLogEventId the UUID assigned at publish time
     * @return existing row if already persisted, otherwise empty
     */
    Optional<ActivityLog> findByActLogEventId(String actLogEventId);
}
