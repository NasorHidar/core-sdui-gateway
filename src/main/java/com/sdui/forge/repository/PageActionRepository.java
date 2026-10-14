package com.sdui.forge.repository;

import com.sdui.forge.domain.PageAction;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Repository for {@link PageAction}.
 */
@Repository
public interface PageActionRepository extends ListCrudRepository<PageAction, Long> {

    /**
     * Fetches all actions linked to any of the menu nodes that map to the given page.
     *
     * <p>This is the key query for building a complete page configuration:
     * given a PAGE_ID, resolve the SERVICE_DETAILS rows that reference it,
     * then pull all PAGE_ACTION rows linked to those menu nodes.</p>
     *
     * <p>Single-query join avoids the N+1 trap that would occur if we
     * fetched menu IDs first and then queried actions per menu.</p>
     */
    @Query("""
            SELECT pa.ACT_ID,
                   pa.SVRD_MENU_ID,
                   pa.ACT_NAME,
                   pa.ACT_TYPE,
                   pa.ACT_HTTP_METHOD,
                   pa.ACT_TARGET_ENDPOINT,
                   pa.ACT_TARGET_WIDGET,
                   pa.ACT_JSON_SCHEMA
              FROM PAGE_ACTION pa
             INNER JOIN SERVICE_DETAILS sd
                ON pa.SVRD_MENU_ID = sd.SVRD_MENU_ID
             WHERE sd.SVRD_PAGE_ID = :pageId
               AND sd.SVRD_IS_ACTIVE = 1
             ORDER BY pa.ACT_NAME
            """)
    List<PageAction> findActionsByPageId(Long pageId);

    /**
     * Fetches all actions for a specific menu node.
     */
    List<PageAction> findBySvrdMenuId(Long svrdMenuId);
}
