package com.sdui.forge.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.sdui.forge.audit.ActivityLogEvent;
import com.sdui.forge.audit.AuditLogProducer;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.List;
import java.util.Map;

/**
 * Controller providing core banking mock endpoints for SDUI actions.
 *
 * <p>All endpoints are secured via Spring Security Bearer tokens. Actions
 * asynchronously publish transactional audit events to Kafka for persistence
 * into Oracle ACTIVITY_LOG.</p>
 */
@RestController
@RequestMapping(path = "/api/v1/core", produces = MediaType.APPLICATION_JSON_VALUE)
public class CoreBankingMockController {

    private static final Logger log = LoggerFactory.getLogger(CoreBankingMockController.class);

    private final AuditLogProducer auditLogProducer;
    private final ObjectMapper objectMapper;

    public CoreBankingMockController(AuditLogProducer auditLogProducer, ObjectMapper objectMapper) {
        this.auditLogProducer = auditLogProducer;
        this.objectMapper = objectMapper;
    }

    private String getUserId(Principal principal) {
        return principal != null ? principal.getName() : "system";
    }

    @PostMapping("/accounts/search")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> searchAccounts(
            @RequestBody Map<String, Object> payload,
            Principal principal,
            HttpServletRequest request) {

        String user = getUserId(principal);
        String acctNo = String.valueOf(payload.getOrDefault("accountNo", "100293847"));
        log.info("CoreBanking: Account search for account {} by user {}", acctNo, user);

        // Comprehensive Audit Event: targetEndpoint, executionStatus, user ID, requested payload
        Map<String, Object> auditData = Map.of(
                "targetEndpoint", "/api/v1/core/accounts/search",
                "executionStatus", "SUCCESS",
                "action", "SEARCH_QUERY",
                "requestPayload", payload
        );
        String auditJson;
        try {
            auditJson = objectMapper.writeValueAsString(auditData);
        } catch (Exception e) {
            auditJson = String.valueOf(payload);
        }

        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "SEARCH_QUERY",
                acctNo,
                auditJson,
                request.getRemoteAddr()
        ));

        // Returns data structure matching SkeletonGrid expectation
        Map<String, Object> response = Map.of(
                "accountNo", acctNo,
                "accountTitle", "Global Logistics Prime Current Account",
                "currency", "USD",
                "availableBalance", 45280.50,
                "ledgerBalance", 46100.00,
                "status", "ACTIVE",
                "branchCode", payload.getOrDefault("branchCode", "BR001"),
                "rows", List.of(
                        Map.of("date", "2026-10-24", "ref", "TXN-902182", "description", "ACH Credit - Payroll Inward", "amount", "+12,500.00", "balance", "$45,280.50"),
                        Map.of("date", "2026-10-23", "ref", "TXN-901844", "description", "Wire Out - Vendor Settlement", "amount", "-4,200.00", "balance", "$32,780.50"),
                        Map.of("date", "2026-10-22", "ref", "TXN-900311", "description", "Service Fee / Maintenance", "amount", "-35.00", "balance", "$36,980.50"),
                        Map.of("date", "2026-10-20", "ref", "TXN-899451", "description", "Cheque Deposit #440192", "amount", "+8,150.00", "balance", "$37,015.50")
                )
        );

        return ResponseEntity.ok(response);
    }

    @PostMapping("/accounts/create")
    @PreAuthorize("hasAnyRole('MAKER', 'ADMIN')")
    public ResponseEntity<?> createAccount(
            @RequestBody Map<String, Object> payload,
            Principal principal,
            HttpServletRequest request) {

        String user = getUserId(principal);
        String title = String.valueOf(payload.getOrDefault("title", "New Corporate Account"));
        log.info("CoreBanking: Creating account '{}' by user {}", title, user);

        String generatedAcct = "100" + (100000 + (long)(Math.random() * 899999));

        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "ACCOUNT_CREATE",
                generatedAcct,
                "{\"title\":\"" + title + "\",\"acct\":\"" + generatedAcct + "\"}",
                request.getRemoteAddr()
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "message", "Account successfully initiated and queued for dual-control authorization.",
                "accountNo", generatedAcct,
                "status", "PENDING_VERIFICATION"
        ));
    }

    @PostMapping("/transfers/execute")
    @PreAuthorize("hasAnyRole('MAKER', 'ADMIN')")
    public ResponseEntity<?> executeTransfer(
            @RequestBody Map<String, Object> payload,
            Principal principal,
            HttpServletRequest request) {

        String user = getUserId(principal);
        String src = String.valueOf(payload.getOrDefault("sourceAccount", ""));
        String dest = String.valueOf(payload.getOrDefault("destAccount", payload.getOrDefault("targetAccount", "")));
        Object amt = payload.getOrDefault("amount", payload.getOrDefault("transferAmount", 0));
        String txnId = "TXN-" + System.currentTimeMillis();

        log.info("CoreBanking: Transfer {} from {} to {} by user {}", amt, src, dest, user);

        // Comprehensive Audit Event: targetEndpoint, executionStatus, user ID, requested payload
        Map<String, Object> auditData = Map.of(
                "targetEndpoint", "/api/v1/core/transfers/execute",
                "executionStatus", "PENDING_APPROVAL",
                "action", "FORM_SUBMISSION",
                "transactionId", txnId,
                "requestPayload", payload
        );
        String auditJson;
        try {
            auditJson = objectMapper.writeValueAsString(auditData);
        } catch (Exception e) {
            auditJson = String.valueOf(payload);
        }

        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "FORM_SUBMISSION",
                txnId,
                auditJson,
                request.getRemoteAddr()
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "transactionId", txnId,
                "status", "PENDING_APPROVAL",
                "message", "Fund transfer submitted. Awaiting dual-control checker authorization."
        ));
    }

    @PostMapping("/transfers/confirm")
    @PreAuthorize("hasAnyRole('MAKER', 'ADMIN')")
    public ResponseEntity<?> confirmTransfer(
            @RequestBody Map<String, Object> payload,
            Principal principal,
            HttpServletRequest request) {

        String user = getUserId(principal);
        String src = String.valueOf(payload.getOrDefault("sourceAccount", ""));
        String dest = String.valueOf(payload.getOrDefault("destAccount", payload.getOrDefault("targetAccount", "")));
        Object amt = payload.getOrDefault("amount", payload.getOrDefault("transferAmount", 0));
        String txnId = "CONFIRM-" + System.currentTimeMillis();

        log.info("CoreBanking: Pre-settlement validation for transfer {} from {} to {} by user {}. Complete payload: {}", amt, src, dest, user, payload);

        // Comprehensive Audit Event: targetEndpoint, executionStatus, user ID, requested payload
        Map<String, Object> auditData = Map.of(
                "targetEndpoint", "/api/v1/core/transfers/confirm",
                "executionStatus", "PRE_CONFIRMED",
                "action", "API_ROUTING",
                "transactionId", txnId,
                "requestPayload", payload
        );
        String auditJson;
        try {
            auditJson = objectMapper.writeValueAsString(auditData);
        } catch (Exception e) {
            auditJson = String.valueOf(payload);
        }

        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "API_ROUTING",
                txnId,
                auditJson,
                request.getRemoteAddr()
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "transactionId", txnId,
                "status", "PRE_CONFIRMED",
                "message", "Pre-settlement confirmation verified by Business Layer. Ledger limits and routing approved."
        ));
    }

    @PostMapping("/cards/preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> updateCardPreferences(
            @RequestBody Map<String, Object> payload,
            Principal principal,
            HttpServletRequest request) {

        String user = getUserId(principal);
        String cardRef = "CARD-4821";

        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "CARD_PREFERENCES_UPDATE",
                cardRef,
                payload.toString(),
                request.getRemoteAddr()
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "cardRef", cardRef,
                "message", "Card security preferences updated in switch successfully."
        ));
    }

    @PostMapping("/loans/calculate")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> calculateLoan(
            @RequestBody Map<String, Object> payload,
            Principal principal,
            HttpServletRequest request) {

        String user = getUserId(principal);
        double amount = Double.parseDouble(String.valueOf(payload.getOrDefault("facilityAmount", "100000")));
        int months = Integer.parseInt(String.valueOf(payload.getOrDefault("termMonths", "36")));

        double rate = 0.0725; // 7.25% APR
        double monthlyRate = rate / 12;
        double emi = (amount * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);

        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "LOAN_CALCULATION",
                "CALC-" + System.currentTimeMillis(),
                "{\"amount\":" + amount + ",\"months\":" + months + "}",
                request.getRemoteAddr()
        ));

        return ResponseEntity.ok(Map.of(
                "requestedAmount", amount,
                "termMonths", months,
                "interestRateApr", "7.25%",
                "estimatedMonthlyEmi", Math.round(emi * 100.0) / 100.0,
                "totalPayable", Math.round((emi * months) * 100.0) / 100.0
        ));
    }
}
