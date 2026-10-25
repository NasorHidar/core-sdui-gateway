package com.sdui.forge.controller;

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

    public CoreBankingMockController(AuditLogProducer auditLogProducer) {
        this.auditLogProducer = auditLogProducer;
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

        // Publish audit event
        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "ACCOUNT_SEARCH",
                acctNo,
                "{\"accountNo\":\"" + acctNo + "\"}",
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
        String dest = String.valueOf(payload.getOrDefault("destAccount", ""));
        Object amt = payload.getOrDefault("amount", 0);
        String txnId = "TXN-" + System.currentTimeMillis();

        log.info("CoreBanking: Transfer {} from {} to {} by user {}", amt, src, dest, user);

        auditLogProducer.publish(ActivityLogEvent.create(
                user,
                "FUND_TRANSFER",
                txnId,
                "{\"source\":\"" + src + "\",\"dest\":\"" + dest + "\",\"amount\":" + amt + "}",
                request.getRemoteAddr()
        ));

        return ResponseEntity.ok(Map.of(
                "success", true,
                "transactionId", txnId,
                "status", "PENDING_APPROVAL",
                "message", "Fund transfer submitted. Awaiting dual-control checker authorization."
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
