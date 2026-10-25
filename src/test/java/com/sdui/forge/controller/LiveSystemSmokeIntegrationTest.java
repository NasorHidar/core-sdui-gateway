package com.sdui.forge.controller;

import com.sdui.forge.config.RedisCacheConfig;
import com.sdui.forge.dto.MenuNodeDto;
import com.sdui.forge.dto.PageBlueprintDto;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.cache.CacheManager;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * End-to-end live integration test verifying the entire SDUI Forge pipeline
 * against live running Docker services (Oracle 23ai, Redis 7, Kafka KRaft).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class LiveSystemSmokeIntegrationTest {

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    private static String jwtToken;

    @Test
    @Order(1)
    @DisplayName("1. POST /api/v1/auth/login -> Authenticates maker_user and issues JWT")
    void testAuthLogin() {
        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        HttpEntity<Map<String, String>> request = new HttpEntity<>(
                Map.of("username", "maker_user", "password", "password"),
                headers
        );

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/v1/auth/login",
                request,
                Map.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("token")).isNotNull();
        jwtToken = (String) response.getBody().get("token");
        assertThat(jwtToken).isNotEmpty();
    }

    @Test
    @Order(2)
    @DisplayName("2. GET /api/v1/menus -> Returns hierarchical menu tree")
    void testGetMenuTree() {
        assertThat(jwtToken).as("JWT token must be populated from test 1").isNotNull();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<List<MenuNodeDto>> response = restTemplate.exchange(
                "/api/v1/menus",
                HttpMethod.GET,
                request,
                new ParameterizedTypeReference<>() {}
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody()).isNotEmpty();
    }

    @Test
    @Order(3)
    @DisplayName("3. GET /api/v1/pages/101/blueprint -> Returns SDUI blueprint from Oracle 23ai JSON")
    void testGetPageBlueprint() {
        assertThat(jwtToken).isNotNull();

        // Evict cache to ensure cold lookup
        Objects.requireNonNull(cacheManager.getCache(RedisCacheConfig.CACHE_PAGE_BLUEPRINT)).clear();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        HttpEntity<Void> request = new HttpEntity<>(headers);

        ResponseEntity<PageBlueprintDto> response = restTemplate.exchange(
                "/api/v1/pages/101/blueprint",
                HttpMethod.GET,
                request,
                PageBlueprintDto.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        PageBlueprintDto dto = response.getBody();
        assertThat(dto).isNotNull();
        assertThat(dto.pageId()).isEqualTo(101L);
        assertThat(dto.uiBlueprint()).isNotNull();

        // Verify Redis cached key
        Set<String> keys = redisTemplate.keys("sdui::pageBlueprint::*101*");
        assertThat(keys).isNotEmpty();
    }

    @Test
    @Order(4)
    @DisplayName("4. POST /api/v1/core/accounts/search -> Executes dynamic action & publishes Kafka audit")
    void testCoreBankingSearchAndAudit() throws InterruptedException {
        assertThat(jwtToken).isNotNull();

        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(jwtToken);
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> request = new HttpEntity<>(
                Map.of("accountNo", "100293847", "branchCode", "BR001"),
                headers
        );

        ResponseEntity<Map> response = restTemplate.postForEntity(
                "/api/v1/core/accounts/search",
                request,
                Map.class
        );

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().get("status")).isEqualTo("ACTIVE");

        // Await Kafka consumer virtual thread to persist the record to Oracle ACTIVITY_LOG
        boolean persisted = false;
        for (int i = 0; i < 20; i++) {
            Integer count = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM ACTIVITY_LOG WHERE ACT_LOG_ACTION = 'ACCOUNT_SEARCH' AND ACT_LOG_REFERENCE_KEY = '100293847'",
                    Integer.class
            );
            if (count != null && count >= 1) {
                persisted = true;
                break;
            }
            Thread.sleep(500);
        }
        assertThat(persisted).as("Kafka consumer should persist audit event to Oracle ACTIVITY_LOG within 10s").isTrue();
    }
}
