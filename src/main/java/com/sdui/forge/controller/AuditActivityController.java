package com.sdui.forge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sdui.forge.audit.ActivityLogEvent;
import com.sdui.forge.audit.AuditLogProducer;
import com.sdui.forge.domain.ActivityLog;
import com.sdui.forge.repository.ActivityLogRepository;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller exposing endpoints for comprehensive audit logging and compliance traceability.
 *
 * <p>Every critical interaction—including search queries, form submissions, and API routing—
 * is asynchronously published to Kafka and persisted into Oracle ACTIVITY_LOG.</p>
 */
@RestController
@RequestMapping(path = "/api/v1/audit", produces = MediaType.APPLICATION_JSON_VALUE)
public class AuditActivityController {

    private static final Logger log = LoggerFactory.getLogger(AuditActivityController.class);

    private final AuditLogProducer auditLogProducer;
    private final ActivityLogRepository activityLogRepository;
    private final ObjectMapper objectMapper;

    public AuditActivityController(
            AuditLogProducer auditLogProducer,
            ActivityLogRepository activityLogRepository,
            ObjectMapper objectMapper) {
        this.auditLogProducer = auditLogProducer;
        this.activityLogRepository = activityLogRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * Asynchronously tracks an audit event (Search Queries, Form Submissions, API Routing).
     * Fire-and-forget virtual thread non-blocking execution.
     */
    @PostMapping("/track")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> trackActivity(
            @RequestBody Map<String, Object> requestBody,
            Principal principal,
            HttpServletRequest request) {

        String userId = principal != null ? principal.getName() : "system";
        String action = String.valueOf(requestBody.getOrDefault("action", "API_ROUTING"));
        String targetEndpoint = String.valueOf(requestBody.getOrDefault("targetEndpoint", request.getRequestURI()));
        String referenceKey = String.valueOf(requestBody.getOrDefault("referenceKey", "REF-" + System.currentTimeMillis()));
        String executionStatus = String.valueOf(requestBody.getOrDefault("executionStatus", "SUCCESS"));
        Object rawPayload = requestBody.getOrDefault("payload", requestBody);

        String payloadJson;
        try {
            Map<String, Object> enrichedPayload = new HashMap<>();
            enrichedPayload.put("targetEndpoint", targetEndpoint);
            enrichedPayload.put("executionStatus", executionStatus);
            enrichedPayload.put("action", action);
            enrichedPayload.put("requestPayload", rawPayload);
            payloadJson = objectMapper.writeValueAsString(enrichedPayload);
        } catch (Exception e) {
            payloadJson = String.valueOf(rawPayload);
        }

        ActivityLogEvent event = ActivityLogEvent.create(
                userId,
                action,
                referenceKey,
                payloadJson,
                request.getRemoteAddr()
        );

        log.info("ComprehensiveAudit: Logging event {} [action={}, targetEndpoint={}, status={}] by user {}",
                event.eventId(), action, targetEndpoint, executionStatus, userId);

        auditLogProducer.publish(event);

        return ResponseEntity.status(HttpStatus.ACCEPTED).body(Map.of(
                "status", "QUEUED",
                "eventId", event.eventId(),
                "action", action,
                "targetEndpoint", targetEndpoint,
                "executionStatus", executionStatus
        ));
    }

    /**
     * Retrieves the latest 50 records from Oracle ACTIVITY_LOG for compliance inspection.
     */
    @GetMapping("/logs")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<List<ActivityLog>> getRecentLogs() {
        log.debug("GET /api/v1/audit/logs — fetching latest ACTIVITY_LOG records");
        List<ActivityLog> logs = activityLogRepository.findRecentLogs();
        return ResponseEntity.ok(logs);
    }

    /**
     * Returns compliance statistics.
     */
    @GetMapping("/stats")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getAuditStats() {
        long total = activityLogRepository.countTotalLogs();
        return ResponseEntity.ok(Map.of(
                "totalLoggedEvents", total,
                "systemStatus", "AUDIT_PIPELINE_HEALTHY",
                "storageEngine", "Oracle 23ai CLOB",
                "messagingBus", "Apache Kafka"
        ));
    }
}
