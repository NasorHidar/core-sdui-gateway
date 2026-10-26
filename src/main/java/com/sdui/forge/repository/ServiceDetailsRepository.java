package com.sdui.forge.repository;

import com.sdui.forge.domain.ServiceDetails;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link ServiceDetails}.
 *
 * <p>Uses Spring Data JDBC — all queries execute as direct SQL against Oracle.
 * No N+1 issues, no lazy-loading proxies, no Hibernate session cache.</p>
 */
@Repository
public interface ServiceDetailsRepository extends ListCrudRepository<ServiceDetails, Long> {

    /**
     * Fetches all active menu nodes ordered for hierarchical assembly.
     *
     * <p>Uses Oracle's {@code CONNECT BY} to produce a depth-first traversal
     * of the menu tree. {@code LEVEL} is used for ordering only — the actual
     * tree structure is assembled in the service layer from flat rows using
     * {@code SVRD_PARENT_MENU_ID}.</p>
     *
     * <p>Why not return LEVEL? Spring Data JDBC maps result sets to the entity
     * record directly. We order by LEVEL + SVRD_MENU_NAME so that siblings
     * appear alphabetically under their parent, and the service layer groups
     * children by parent ID in O(n) time.</p>
     */
    @Query("""
            SELECT SVRD_MENU_ID,
                   SVR_ID,
                   SVRD_PARENT_MENU_ID,
                   SVRD_MENU_NAME,
                   SVRD_ALLOWED_ROLES,
                   SVRD_PAGE_ID,
                   SVRD_IS_ACTIVE
              FROM SERVICE_DETAILS
             WHERE SVRD_IS_ACTIVE = 1
             START WITH SVRD_PARENT_MENU_ID IS NULL
           CONNECT BY PRIOR SVRD_MENU_ID = SVRD_PARENT_MENU_ID
             ORDER SIBLINGS BY SVRD_MENU_NAME
            """)
    List<ServiceDetails> findActiveMenuHierarchy();

    /**
     * Finds all active menu nodes that link to the given page ID.
     *
     * <p>Used to resolve which menu contexts own actions for a specific page.</p>
     */
    @Query("""
            SELECT SVRD_MENU_ID,
                   SVR_ID,
                   SVRD_PARENT_MENU_ID,
                   SVRD_MENU_NAME,
                   SVRD_ALLOWED_ROLES,
                   SVRD_PAGE_ID,
                   SVRD_IS_ACTIVE
              FROM SERVICE_DETAILS
             WHERE SVRD_PAGE_ID = :pageId
               AND SVRD_IS_ACTIVE = 1
            """)
    List<ServiceDetails> findActiveByPageId(Long pageId);

    /**
     * Finds all active hierarchical menu nodes belonging to a specific primary service.
     */
    @Query("""
            SELECT SVRD_MENU_ID,
                   SVR_ID,
                   SVRD_PARENT_MENU_ID,
                   SVRD_MENU_NAME,
                   SVRD_ALLOWED_ROLES,
                   SVRD_PAGE_ID,
                   SVRD_IS_ACTIVE
              FROM SERVICE_DETAILS
             WHERE SVR_ID = :serviceId
               AND SVRD_IS_ACTIVE = 1
             ORDER BY SVRD_DISPLAY_ORDER ASC, SVRD_MENU_NAME ASC
            """)
    List<ServiceDetails> findActiveByServiceId(Long serviceId);
}
