package com.sdui.forge.service;

import com.sdui.forge.domain.PageAction;
import com.sdui.forge.domain.PageTemplate;
import com.sdui.forge.domain.ServiceDetails;
import com.sdui.forge.domain.ServiceEntity;
import com.sdui.forge.dto.MenuNodeDto;
import com.sdui.forge.dto.PageBlueprintDto;
import com.sdui.forge.dto.PrimaryServiceDto;
import com.sdui.forge.dto.SearchSkeletonDto;
import com.sdui.forge.exception.ResourceNotFoundException;
import com.sdui.forge.repository.PageActionRepository;
import com.sdui.forge.repository.PageTemplateRepository;
import com.sdui.forge.repository.ServiceDetailsRepository;
import com.sdui.forge.repository.ServiceRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

import static com.sdui.forge.config.RedisCacheConfig.CACHE_MENU_TREE;
import static com.sdui.forge.config.RedisCacheConfig.CACHE_PAGE_BLUEPRINT;

/**
 * Core service for SDUI page metadata operations.
 *
 * <p>Orchestrates repository calls and transforms flat database rows
 * into the hierarchical/composite DTOs expected by the API layer.</p>
 *
 * <p>All reads are marked {@code @Transactional(readOnly = true)} to:
 * <ul>
 *     <li>Signal the connection pool that no write-locks are needed</li>
 *     <li>Enable Oracle read-consistency optimizations</li>
 *     <li>Prevent accidental writes in query-only flows</li>
 * </ul>
 *
 * <p><b>Phase 4 — Caching:</b> {@code getPageBlueprint} and {@code getMenuTree}
 * are backed by Redis via {@code @Cacheable}. Cache entries are evicted when
 * the page version changes or an admin triggers a manual flush.</p>
 */
@Service
public class PageMetadataService {

    private static final Logger log = LoggerFactory.getLogger(PageMetadataService.class);

    private final ServiceDetailsRepository serviceDetailsRepository;
    private final ServiceRepository serviceRepository;
    private final PageTemplateRepository pageTemplateRepository;
    private final PageActionRepository pageActionRepository;
    private final ObjectMapper objectMapper;

    public PageMetadataService(ServiceDetailsRepository serviceDetailsRepository,
                               ServiceRepository serviceRepository,
                               PageTemplateRepository pageTemplateRepository,
                               PageActionRepository pageActionRepository,
                               ObjectMapper objectMapper) {
        this.serviceDetailsRepository = serviceDetailsRepository;
        this.serviceRepository = serviceRepository;
        this.pageTemplateRepository = pageTemplateRepository;
        this.pageActionRepository = pageActionRepository;
        this.objectMapper = objectMapper;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Method 1: Hierarchical Menu Tree
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Builds the complete hierarchical menu tree from flat database rows.
     *
     * <p>Algorithm (O(n) time, O(n) space):
     * <ol>
     *     <li>Fetch all active rows pre-ordered by Oracle's CONNECT BY</li>
     *     <li>Index all nodes by their menu ID in a HashMap</li>
     *     <li>Iterate once: attach each node to its parent's children list</li>
     *     <li>Return only root nodes (parentMenuId == null)</li>
     * </ol>
     *
     * <p>This avoids recursive DB queries and builds the tree in-memory
     * from a single SQL round-trip.</p>
     *
     * <p><b>Cached</b> in Redis under {@code menuTree} with a 60-minute TTL.
     * The menu tree changes infrequently; a single cache key suffices.</p>
     *
     * @return list of root-level {@link MenuNodeDto} with nested children
     */
    @Cacheable(value = CACHE_MENU_TREE, key = "'all'")
    @Transactional(readOnly = true)
    public List<MenuNodeDto> getMenuTree() {
        log.debug("Fetching hierarchical menu tree (cache miss)");

        List<ServiceDetails> flatRows = serviceDetailsRepository.findActiveMenuHierarchy();

        if (flatRows.isEmpty()) {
            log.info("No active menu entries found");
            return Collections.emptyList();
        }

        // Phase 1: Create DTO nodes and index by menu ID
        // Using LinkedHashMap to preserve Oracle's CONNECT BY ordering
        Map<Long, MenuNodeDto> nodeIndex = new LinkedHashMap<>(flatRows.size());
        for (ServiceDetails row : flatRows) {
            MenuNodeDto node = new MenuNodeDto(
                    row.svrdMenuId(),
                    row.svrdMenuName(),
                    row.svrdPageId(),
                    row.svrdAllowedRoles(),
                    new ArrayList<>() // mutable children list
            );
            nodeIndex.put(row.svrdMenuId(), node);
        }

        // Phase 2: Wire parent-child relationships
        List<MenuNodeDto> roots = new ArrayList<>();
        for (ServiceDetails row : flatRows) {
            MenuNodeDto node = nodeIndex.get(row.svrdMenuId());
            if (row.svrdParentMenuId() == null) {
                roots.add(node);
            } else {
                MenuNodeDto parent = nodeIndex.get(row.svrdParentMenuId());
                if (parent != null) {
                    parent.children().add(node);
                } else {
                    // Orphan node — parent is inactive or missing. Promote to root.
                    log.warn("Orphan menu node detected: menuId={}, parentId={}",
                            row.svrdMenuId(), row.svrdParentMenuId());
                    roots.add(node);
                }
            }
        }

        log.debug("Menu tree built: {} root nodes from {} total rows", roots.size(), flatRows.size());
        return Collections.unmodifiableList(roots);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Method 2: Complete Page Configuration (Blueprint + Actions)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Fetches the complete SDUI page configuration for a given page ID.
     *
     * <p>Combines the {@link PageTemplate} blueprint with all {@link PageAction}
     * entries linked to that page through the SERVICE_DETAILS bridge table.
     * The JSON blueprint string is parsed into an Object so Jackson serializes
     * it as a native JSON object in the response (not a double-escaped string).</p>
     *
     * <p><b>Cached</b> in Redis under {@code pageBlueprint::{pageId}} with a
     * 30-minute TTL. Evicted when the page version is updated via
     * {@link #evictBlueprintCache(Long)}.</p>
     *
     * @param pageId the page identifier
     * @return composite {@link PageBlueprintDto} containing blueprint + actions
     * @throws ResourceNotFoundException if no page exists with the given ID
     */
    @Cacheable(value = CACHE_PAGE_BLUEPRINT, key = "#pageId")
    @Transactional(readOnly = true)
    public PageBlueprintDto getPageBlueprint(Long pageId) {
        log.debug("Fetching page blueprint for pageId={} (cache miss)", pageId);

        // 1. Fetch the page template
        PageTemplate page = pageTemplateRepository.findById(pageId)
                .orElseThrow(() -> new ResourceNotFoundException("PageTemplate", pageId));

        // 2. Fetch all actions linked to this page (single-query join in repository)
        List<PageAction> actions = pageActionRepository.findActionsByPageId(pageId);

        // 3. Parse JSON strings into Objects for clean serialization
        Object parsedBlueprint = parseJsonSafely(page.pageUiBlueprint(), "PAGE_UI_BLUEPRINT");

        List<PageBlueprintDto.ActionDto> actionDtos = actions.stream()
                .map(action -> new PageBlueprintDto.ActionDto(
                        action.actId(),
                        action.actName(),
                        action.actType(),
                        action.actHttpMethod(),
                        action.actTargetEndpoint(),
                        action.actTargetWidget(),
                        parseJsonSafely(action.actJsonSchema(), "ACT_JSON_SCHEMA")
                ))
                .collect(Collectors.toList());

        log.debug("Page blueprint assembled: pageId={}, actions={}", pageId, actionDtos.size());

        return new PageBlueprintDto(
                page.pageId(),
                page.pageTitle(),
                page.pageLayoutType(),
                page.pageVersion(),
                parsedBlueprint,
                actionDtos
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Cache Eviction
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Evicts the cached blueprint for a specific page.
     *
     * <p>Call this when {@code PAGE_VERSION} is updated in the database —
     * either from an admin API, a database trigger, or a version-bump workflow.
     * The next request for this page will repopulate the cache from Oracle.</p>
     *
     * @param pageId the page whose cache entry should be invalidated
     */
    @CacheEvict(value = CACHE_PAGE_BLUEPRINT, key = "#pageId")
    public void evictBlueprintCache(Long pageId) {
        log.info("Cache evicted: {} for pageId={}", CACHE_PAGE_BLUEPRINT, pageId);
    }

    /**
     * Evicts all cached blueprints. Used for bulk schema migrations or
     * emergency cache flushes.
     */
    @CacheEvict(value = CACHE_PAGE_BLUEPRINT, allEntries = true)
    public void evictAllBlueprintCaches() {
        log.info("Cache evicted: all entries in {}", CACHE_PAGE_BLUEPRINT);
    }

    /**
     * Evicts the cached menu tree. Call when SERVICE_DETAILS rows change.
     */
    @CacheEvict(value = CACHE_MENU_TREE, allEntries = true)
    public void evictMenuTreeCache() {
        log.info("Cache evicted: all entries in {}", CACHE_MENU_TREE);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Internal Helpers
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Parses a JSON string into an {@code Object} (Map/List) for clean
     * Jackson serialization. Returns the raw string as fallback if parsing fails.
     *
     * <p>This ensures the API response contains native JSON objects rather
     * than double-escaped JSON strings — critical for the SDUI frontend engine
     * which expects a directly-traversable JSON tree.</p>
     */
    /**
     * Fetches all active primary services from the {@code SERVICE} table,
     * strictly ordered by {@code SVR_SORT_ORDER} ascending.
     * Enriches each primary service with its authorized sub-services from {@code SERVICE_DETAILS}.
     */
    @Cacheable(value = CACHE_MENU_TREE, key = "'primary-services'")
    @Transactional(readOnly = true)
    public List<PrimaryServiceDto> getPrimaryServices() {
        log.debug("Fetching primary services from SERVICE table ordered by SVR_SORT_ORDER");
        List<ServiceEntity> activeServices = serviceRepository.findActiveServicesOrdered();

        List<ServiceDetails> allMenuRows = serviceDetailsRepository.findActiveMenuHierarchy();
        Map<Long, List<MenuNodeDto>> childrenByServiceId = new HashMap<>();

        for (ServiceDetails row : allMenuRows) {
            if (row.svrId() != null && row.svrdParentMenuId() != null) {
                childrenByServiceId
                        .computeIfAbsent(row.svrId(), k -> new ArrayList<>())
                        .add(new MenuNodeDto(
                                row.svrdMenuId(),
                                row.svrdMenuName(),
                                row.svrdPageId(),
                                row.svrdAllowedRoles(),
                                Collections.emptyList()
                        ));
            }
        }

        return activeServices.stream().map(s -> new PrimaryServiceDto(
                s.svrId(),
                s.svrName(),
                s.svrIconUrl(),
                s.svrBaseApiUrl(),
                s.svrIsActive(),
                s.svrSortOrder(),
                childrenByServiceId.getOrDefault(s.svrId(), Collections.emptyList())
        )).toList();
    }

    /**
     * Fetches and builds the complete multi-level hierarchical sub-service tree
     * for a specific primary service (SVR_ID).
     */
    @Cacheable(value = CACHE_MENU_TREE, key = "'sub-services-' + #serviceId")
    @Transactional(readOnly = true)
    public List<MenuNodeDto> getSubServicesForService(Long serviceId) {
        log.debug("Fetching hierarchical sub-services for service ID: {}", serviceId);
        List<ServiceDetails> rows = serviceDetailsRepository.findActiveByServiceId(serviceId);
        if (rows.isEmpty()) {
            return Collections.emptyList();
        }

        Map<Long, MenuNodeDto> nodeMap = new LinkedHashMap<>();
        for (ServiceDetails row : rows) {
            SearchSkeletonDto skeleton = row.svrdPageId() != null
                    ? getSearchSkeleton(row.svrdPageId(), row.svrdMenuId())
                    : null;

            nodeMap.put(row.svrdMenuId(), new MenuNodeDto(
                    row.svrdMenuId(),
                    row.svrdMenuName(),
                    row.svrdPageId(),
                    row.svrdAllowedRoles(),
                    new ArrayList<>(),
                    skeleton
            ));
        }

        List<MenuNodeDto> roots = new ArrayList<>();
        for (ServiceDetails row : rows) {
            MenuNodeDto node = nodeMap.get(row.svrdMenuId());
            Long parentId = row.svrdParentMenuId();
            if (parentId == null || !nodeMap.containsKey(parentId)) {
                roots.add(node);
            } else {
                MenuNodeDto parent = nodeMap.get(parentId);
                parent.children().add(node);
            }
        }

        return roots;
    }

    /**
     * Dynamically generates the search UI skeleton configuration and validation rules
     * for a given page template and menu item.
     *
     * <p>Supports:
     * <ul>
     *   <li>Smart Bypass: 0 fields / requiresSearch = false (e.g. Page 103, 999)</li>
     *   <li>Single Field: Dynamic generation with regex pattern validation (e.g. 1021, 104)</li>
     *   <li>Multiple Fields: Composite criteria with dropdowns, ranges, and patterns (e.g. 101, 1022, 1042, 105)</li>
     * </ul>
     */
    public SearchSkeletonDto getSearchSkeleton(Long pageId, Long menuId) {
        if (pageId == null) {
            return new SearchSkeletonDto(null, "Menu Navigation", "Folder navigation node.", "📁", false, "Open", Collections.emptyList());
        }

        long pid = pageId;
        long mid = menuId != null ? menuId : pid;

        // Page 103: Transaction History -> SMART BYPASS (0 fields)
        if (pid == 103) {
            return new SearchSkeletonDto(
                    103L,
                    "Transaction History & Audit",
                    "Direct ledger query using active session credentials.",
                    "📋",
                    false, // requiresSearch = false -> Smart Bypass!
                    "Load Ledger",
                    Collections.emptyList()
            );
        }

        // Page 999: Fallback & Resilience Demo -> SMART BYPASS (0 fields)
        if (pid == 999) {
            return new SearchSkeletonDto(
                    999L,
                    "Fallback & Resilience Demo",
                    "Direct execution test of SDUI resilience engine.",
                    "🧪",
                    false, // requiresSearch = false -> Smart Bypass!
                    "Run Test",
                    Collections.emptyList()
            );
        }

        // Page 101: Customer Dashboard -> MULTIPLE FIELDS (2 fields)
        if (pid == 101) {
            return new SearchSkeletonDto(
                    101L,
                    "Customer Account Inquiry",
                    "Specify account number and optional branch identifier to retrieve profile.",
                    "👤",
                    true,
                    "Retrieve Account Profile",
                    List.of(
                            new SearchSkeletonDto.SearchFieldDto(
                                    "accountNo",
                                    "Account Number",
                                    "text",
                                    true,
                                    "e.g. 100293847",
                                    null,
                                    Collections.emptyList(),
                                    new SearchSkeletonDto.ValidationRuleDto(
                                            "^[0-9]{9,12}$",
                                            9,
                                            12,
                                            null,
                                            null,
                                            "Account number must be 9 to 12 numeric digits."
                                    )
                            ),
                            new SearchSkeletonDto.SearchFieldDto(
                                    "accountType",
                                    "Account Classification",
                                    "select",
                                    false,
                                    "Select classification",
                                    "ALL",
                                    List.of(
                                            new SearchSkeletonDto.SelectOptionDto("ALL", "All Account Types"),
                                            new SearchSkeletonDto.SelectOptionDto("SAVINGS", "Savings Account"),
                                            new SearchSkeletonDto.SelectOptionDto("CURRENT", "Current / Checking"),
                                            new SearchSkeletonDto.SelectOptionDto("ESCROW", "Escrow Account")
                                    ),
                                    null
                            )
                    )
            );
        }

        // Page 102: Fund Transfer
        if (pid == 102) {
            // Sub-menu 1022: Instant Wire Transfer (RTGS) -> MULTIPLE FIELDS (2 fields)
            if (mid == 1022) {
                return new SearchSkeletonDto(
                        102L,
                        "Instant Wire Transfer (RTGS)",
                        "Enter originating account and RTGS / SWIFT clearing code.",
                        "⚡",
                        true,
                        "Authorize Wire Session",
                        List.of(
                                new SearchSkeletonDto.SearchFieldDto(
                                        "sourceAccount",
                                        "Originating Account",
                                        "text",
                                        true,
                                        "e.g. 1029384756",
                                        null,
                                        Collections.emptyList(),
                                        new SearchSkeletonDto.ValidationRuleDto(
                                                "^[0-9]{10}$",
                                                10,
                                                10,
                                                null,
                                                null,
                                                "Originating account must be exactly 10 numeric digits."
                                        )
                                ),
                                new SearchSkeletonDto.SearchFieldDto(
                                        "routingCode",
                                        "SWIFT / Clearing Code",
                                        "text",
                                        true,
                                        "e.g. BKTUS33XXX",
                                        null,
                                        Collections.emptyList(),
                                        new SearchSkeletonDto.ValidationRuleDto(
                                                "^[A-Z0-9]{8,11}$",
                                                8,
                                                11,
                                                null,
                                                null,
                                                "SWIFT code must be 8-11 uppercase alphanumeric characters."
                                        )
                                )
                        )
                );
            }

            // Sub-menu 1021 or 102 default: Internal Account Transfer -> SINGLE FIELD (1 field)
            return new SearchSkeletonDto(
                    102L,
                    "Internal Transfer Verification",
                    "Enter the source debit account to verify balance and routing.",
                    "💸",
                    true,
                    "Verify Source Account",
                    List.of(
                            new SearchSkeletonDto.SearchFieldDto(
                                    "sourceAccount",
                                    "Source Account Number",
                                    "text",
                                    true,
                                    "e.g. 1029384756",
                                    null,
                                    Collections.emptyList(),
                                    new SearchSkeletonDto.ValidationRuleDto(
                                            "^[0-9]{10}$",
                                            10,
                                            10,
                                            null,
                                            null,
                                            "Source account must be exactly 10 digits."
                                    )
                            )
                    )
            );
        }

        // Page 104: Card Controls & Limits
        if (pid == 104) {
            if (mid == 1042) {
                // Global POS & ATM Limits -> MULTIPLE FIELDS (2 fields)
                return new SearchSkeletonDto(
                        104L,
                        "Global Card Limit Management",
                        "Specify last 4 digits of card and transaction channel.",
                        "🌐",
                        true,
                        "Query Limit Profiles",
                        List.of(
                                new SearchSkeletonDto.SearchFieldDto(
                                        "cardLast4",
                                        "Card Last 4 Digits",
                                        "text",
                                        true,
                                        "e.g. 4821",
                                        null,
                                        Collections.emptyList(),
                                        new SearchSkeletonDto.ValidationRuleDto(
                                                "^[0-9]{4}$",
                                                4,
                                                4,
                                                null,
                                                null,
                                                "Must be exactly 4 numeric digits."
                                        )
                                ),
                                new SearchSkeletonDto.SearchFieldDto(
                                        "channel",
                                        "Channel Scope",
                                        "select",
                                        true,
                                        "Select channel",
                                        "ATM",
                                        List.of(
                                                new SearchSkeletonDto.SelectOptionDto("ATM", "ATM Withdrawals"),
                                                new SearchSkeletonDto.SelectOptionDto("POS", "Point of Sale (POS)"),
                                                new SearchSkeletonDto.SelectOptionDto("ECOMM", "E-Commerce / Online")
                                        ),
                                        null
                                )
                        )
                );
            }

            // PIN Security / Default 104 -> SINGLE FIELD (1 field)
            return new SearchSkeletonDto(
                    104L,
                    "Card Controls & Security",
                    "Enter last 4 digits of debit or credit card.",
                    "💳",
                    true,
                    "Query Card Details",
                    List.of(
                            new SearchSkeletonDto.SearchFieldDto(
                                    "cardLast4",
                                    "Card Last 4 Digits",
                                    "text",
                                    true,
                                    "e.g. 4821",
                                    null,
                                    Collections.emptyList(),
                                    new SearchSkeletonDto.ValidationRuleDto(
                                            "^[0-9]{4}$",
                                            4,
                                            4,
                                            null,
                                            null,
                                            "Must be exactly 4 numeric digits."
                                        )
                            )
                    )
            );
        }

        // Page 105: Commercial Lending Inquiry -> MULTIPLE FIELDS (2 fields)
        if (pid == 105) {
            return new SearchSkeletonDto(
                    105L,
                    "Commercial Lending Inquiry",
                    "Enter Credit Facility ID and amortization term to load calculation.",
                    "📊",
                    true,
                    "Calculate Facility",
                    List.of(
                            new SearchSkeletonDto.SearchFieldDto(
                                    "facilityId",
                                    "Credit Facility ID",
                                    "text",
                                    true,
                                    "e.g. FAC-001",
                                    null,
                                    Collections.emptyList(),
                                    new SearchSkeletonDto.ValidationRuleDto(
                                            "^FAC-[0-9]{3,6}$",
                                            7,
                                            10,
                                            null,
                                            null,
                                            "Facility ID must match format FAC-XXX (e.g. FAC-001)."
                                    )
                            ),
                            new SearchSkeletonDto.SearchFieldDto(
                                    "termMonths",
                                    "Term (Months)",
                                    "number",
                                    true,
                                    "e.g. 36",
                                    "36",
                                    Collections.emptyList(),
                                    new SearchSkeletonDto.ValidationRuleDto(
                                            null,
                                            null,
                                            null,
                                            6.0,
                                            120.0,
                                            "Term must be between 6 and 120 months."
                                    )
                            )
                    )
            );
        }

        // Default Generic Single Field
        return new SearchSkeletonDto(
                pid,
                "Service Inquiry",
                "Enter lookup identifier to load SDUI page.",
                "🔍",
                true,
                "Search",
                List.of(
                        new SearchSkeletonDto.SearchFieldDto(
                                "searchValue",
                                "Search Value",
                                "text",
                                true,
                                "Enter search criteria...",
                                null,
                                Collections.emptyList(),
                                null
                        )
                )
        );
    }

    private Object parseJsonSafely(String json, String fieldName) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (JsonProcessingException e) {
            log.warn("Failed to parse {} as JSON, returning raw string: {}", fieldName, e.getMessage());
            return json;
        }
    }
}
