package com.sdui.forge.repository;

import com.sdui.forge.domain.ServiceEntity;
import org.springframework.data.jdbc.repository.query.Query;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Spring Data JDBC Repository for the {@link ServiceEntity} primary services table.
 */
@Repository
public interface ServiceRepository extends ListCrudRepository<ServiceEntity, Long> {

    /**
     * Fetches all active primary services strictly ordered by SVR_SORT_ORDER ascending.
     */
    @Query("""
            SELECT SVR_ID,
                   SVR_NAME,
                   SVR_ICON_URL,
                   SVR_BASE_API_URL,
                   SVR_IS_ACTIVE,
                   SVR_SORT_ORDER
              FROM SERVICE
             WHERE SVR_IS_ACTIVE = 1
             ORDER BY SVR_SORT_ORDER ASC, SVR_NAME ASC
            """)
    List<ServiceEntity> findActiveServicesOrdered();
}
