package com.sdui.forge.repository;

import com.sdui.forge.domain.ActivityLog;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.CrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
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

    /**
     * Retrieves the most recent audit logs for compliance inspection.
     */
    @Query("SELECT * FROM ACTIVITY_LOG ORDER BY ACT_LOG_ID DESC FETCH FIRST 50 ROWS ONLY")
    List<ActivityLog> findRecentLogs();

    /**
     * Retrieves recent logs for a specific user.
     */
    @Query("SELECT * FROM ACTIVITY_LOG WHERE ACT_LOG_USER_ID = :userId ORDER BY ACT_LOG_ID DESC FETCH FIRST 50 ROWS ONLY")
    List<ActivityLog> findRecentLogsByUser(String userId);

    /**
     * Counts all recorded audit events.
     */
    @Query("SELECT COUNT(*) FROM ACTIVITY_LOG")
    long countTotalLogs();
}
