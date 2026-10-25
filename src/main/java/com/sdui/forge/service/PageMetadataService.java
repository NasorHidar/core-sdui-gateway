package com.sdui.forge.service;

import com.sdui.forge.domain.PageAction;
import com.sdui.forge.domain.PageTemplate;
import com.sdui.forge.domain.ServiceDetails;
import com.sdui.forge.dto.MenuNodeDto;
import com.sdui.forge.dto.PageBlueprintDto;
import com.sdui.forge.exception.ResourceNotFoundException;
import com.sdui.forge.repository.PageActionRepository;
import com.sdui.forge.repository.PageTemplateRepository;
import com.sdui.forge.repository.ServiceDetailsRepository;
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
    private final PageTemplateRepository pageTemplateRepository;
    private final PageActionRepository pageActionRepository;
    private final ObjectMapper objectMapper;

    public PageMetadataService(ServiceDetailsRepository serviceDetailsRepository,
                               PageTemplateRepository pageTemplateRepository,
                               PageActionRepository pageActionRepository,
                               ObjectMapper objectMapper) {
        this.serviceDetailsRepository = serviceDetailsRepository;
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
