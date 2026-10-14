package com.sdui.forge.repository;

import com.sdui.forge.domain.PageTemplate;
import org.springframework.data.repository.ListCrudRepository;
import org.springframework.stereotype.Repository;

/**
 * Repository for {@link PageTemplate}.
 *
 * <p>Inherits standard CRUD from {@link ListCrudRepository}.
 * Custom JSON-path queries against {@code PAGE_UI_BLUEPRINT} can be added
 * here using Oracle's {@code JSON_VALUE} / {@code JSON_QUERY} SQL functions.</p>
 */
@Repository
public interface PageTemplateRepository extends ListCrudRepository<PageTemplate, Long> {
}
