package com.sdui.forge.controller;

import com.sdui.forge.dto.MenuNodeDto;
import com.sdui.forge.dto.PageBlueprintDto;
import com.sdui.forge.dto.PrimaryServiceDto;
import com.sdui.forge.dto.SearchSkeletonDto;
import com.sdui.forge.service.PageMetadataService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * REST controller exposing SDUI metadata endpoints.
 *
 * <p>Serves as the single gateway for frontend SDUI engines to fetch:
 * <ul>
 *     <li>The primary banking services from the SERVICE table</li>
 *     <li>The hierarchical navigation menu tree from SERVICE_DETAILS</li>
 *     <li>Complete page blueprints (UI definition + available actions)</li>
 * </ul>
 *
 * <p>All endpoints return JSON. Every request runs on a virtual thread
 * (Project Loom) — no manual async wiring needed.</p>
 */
@RestController
@RequestMapping(path = "/api/v1", produces = MediaType.APPLICATION_JSON_VALUE)
public class PageMetadataController {

    private static final Logger log = LoggerFactory.getLogger(PageMetadataController.class);

    private final PageMetadataService pageMetadataService;

    public PageMetadataController(PageMetadataService pageMetadataService) {
        this.pageMetadataService = pageMetadataService;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/services
    // Returns active primary services from the SERVICE table ordered by SVR_SORT_ORDER.
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/services")
    public ResponseEntity<List<PrimaryServiceDto>> getPrimaryServices() {
        log.debug("GET /api/v1/services — fetching active primary services ordered by SVR_SORT_ORDER");
        List<PrimaryServiceDto> services = pageMetadataService.getPrimaryServices();
        return ResponseEntity.ok(services);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/services/{serviceId}/sub-services
    // Returns the nested hierarchical sub-service tree for a specific primary service.
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/services/{serviceId}/sub-services")
    public ResponseEntity<List<MenuNodeDto>> getSubServicesForService(@PathVariable Long serviceId) {
        log.debug("GET /api/v1/services/{}/sub-services — fetching hierarchical sub-services", serviceId);
        List<MenuNodeDto> subServices = pageMetadataService.getSubServicesForService(serviceId);
        return ResponseEntity.ok(subServices);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/menus
    // Returns the complete hierarchical menu tree for navigation rendering.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retrieves the hierarchical menu tree.
     *
     * <p>Returns all active menu nodes organized in a parent-child tree
     * structure. The frontend uses this to render the navigation sidebar,
     * breadcrumbs, and role-filtered menu visibility.</p>
     *
     * @return 200 OK with list of root-level {@link MenuNodeDto} nodes
     */
    @GetMapping("/menus")
    public ResponseEntity<List<MenuNodeDto>> getMenuTree() {
        log.debug("GET /api/v1/menus — fetching menu tree");

        List<MenuNodeDto> menuTree = pageMetadataService.getMenuTree();

        return ResponseEntity.ok(menuTree);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/pages/{pageId}/blueprint
    // Returns the SDUI JSON blueprint and related actions for a specific page.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Retrieves the complete SDUI page blueprint.
     *
     * <p>Returns the JSON UI blueprint (consumed by the frontend rendering
     * engine) along with all actions (API calls, navigations) available
     * on the page. This is the primary endpoint that drives server-driven UI.</p>
     *
     * @param pageId the page template identifier
     * @return 200 OK with {@link PageBlueprintDto} containing blueprint + actions
     * @throws com.sdui.forge.exception.ResourceNotFoundException if page not found (→ 404)
     */
    @GetMapping("/pages/{pageId}/blueprint")
    public ResponseEntity<PageBlueprintDto> getPageBlueprint(
            @PathVariable Long pageId) {

        log.debug("GET /api/v1/pages/{}/blueprint — fetching page configuration", pageId);

        PageBlueprintDto blueprint = pageMetadataService.getPageBlueprint(pageId);

        return ResponseEntity.ok(blueprint);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET /api/v1/pages/{pageId}/search-skeleton
    // Returns the dynamic search UI skeleton and validation rules for a page.
    // ─────────────────────────────────────────────────────────────────────────

    @GetMapping("/pages/{pageId}/search-skeleton")
    public ResponseEntity<SearchSkeletonDto> getSearchSkeleton(
            @PathVariable Long pageId,
            @RequestParam(required = false) Long menuId) {

        log.debug("GET /api/v1/pages/{}/search-skeleton (menuId={})", pageId, menuId);

        SearchSkeletonDto skeleton = pageMetadataService.getSearchSkeleton(pageId, menuId);

        return ResponseEntity.ok(skeleton);
    }
}
