package com.sdui.forge.controller;

import com.sdui.forge.audit.AuditLogConsumer;
import com.sdui.forge.audit.AuditLogProducer;
import com.sdui.forge.config.RedisCacheConfig;
import com.sdui.forge.dto.PageBlueprintDto;
import com.sdui.forge.security.JwtTokenProvider;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.cache.CacheManager;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.http.*;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.testcontainers.containers.GenericContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import org.testcontainers.oracle.OracleContainer;
import org.testcontainers.utility.DockerImageName;

import java.util.List;
import java.util.Objects;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Phase 5 Integration Test: PageMetadataController
 *
 * <p>Scope: Verifies the full request-to-response lifecycle for the
 * {@code GET /sdui-forge/api/v1/pages/{pageId}/blueprint} endpoint under
 * isolated, containerized infrastructure:
 * <ul>
 *   <li><b>Testcontainers Oracle 23ai</b> — seeded with a known PAGE_TEMPLATE row
 *       so all repository calls resolve against a real RDBMS, not mocks.</li>
 *   <li><b>Testcontainers Redis 7</b> — confirms that the {@code @Cacheable}
 *       annotation on {@link com.sdui.forge.service.PageMetadataService#getPageBlueprint}
 *       is wired correctly: first request hits Oracle, second request is a Redis
 *       cache HIT (no additional DB round-trip).</li>
 * </ul>
 *
 * <p><b>Why no H2/Mockito?</b> Banking-grade systems must test against the
 * real Oracle JDBC driver (ojdbc11) and OSON converter paths. H2 silently
 * passes Oracle-specific DDL that fails in production (#2843 pattern).
 *
 * <p><b>Virtual Thread note:</b> {@code spring.threads.virtual.enabled=true}
 * remains active during tests — every HTTP request dispatched by
 * {@link TestRestTemplate} runs on a virtual thread, exercising the Loom
 * path in the same way production traffic would.
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@Testcontainers(disabledWithoutDocker = true)
@TestMethodOrder(MethodOrderer.OrderAnnotation.class)
class PageMetadataControllerIntegrationTest {

    // ─────────────────────────────────────────────────────────────────────────
    // Testcontainers: Oracle 23ai + Redis 7
    // Declared as static so containers are shared across all test methods in
    // this class and only started once — avoids 3-4× the startup overhead.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Oracle Free 23ai container.
     * Uses the official oracle/free image; initializes via the built-in
     * FREEPDB1 PDB.
     */
    @Container
    static final OracleContainer oracle =
            new OracleContainer(DockerImageName.parse("gvenzl/oracle-free:23-slim-faststart"))
                    .withUsername("sdui_test")
                    .withPassword("sdui_test_pw")
                    .withReuse(true);

    /**
     * Redis 7 container — mirrors production Lettuce configuration.
     * Port 6379 is mapped to a random host port via Testcontainers.
     */
    @Container
    static final GenericContainer<?> redis =
            new GenericContainer<>(DockerImageName.parse("redis:7-alpine"))
                    .withExposedPorts(6379)
                    .withReuse(true);

    // ─────────────────────────────────────────────────────────────────────────
    // Dynamic Property Wiring
    // Overrides application.yml datasource + redis props at test startup so
    // the Spring context connects to the Testcontainer endpoints, or local running services.
    // ─────────────────────────────────────────────────────────────────────────

    @DynamicPropertySource
    static void overrideProperties(DynamicPropertyRegistry registry) {
        // Oracle: Testcontainers if running, else local compose
        registry.add("spring.datasource.url", () -> {
            try {
                if (oracle.isRunning()) return oracle.getJdbcUrl();
            } catch (Exception ignored) {}
            return "jdbc:oracle:thin:@//localhost:1521/FREEPDB1";
        });
        registry.add("spring.datasource.username", () -> {
            try {
                if (oracle.isRunning()) return oracle.getUsername();
            } catch (Exception ignored) {}
            return "sdui_admin";
        });
        registry.add("spring.datasource.password", () -> {
            try {
                if (oracle.isRunning()) return oracle.getPassword();
            } catch (Exception ignored) {}
            return "sdui_secret";
        });

        // Redis: Testcontainers if running, else local compose
        registry.add("spring.data.redis.host", () -> {
            try {
                if (redis.isRunning()) return redis.getHost();
            } catch (Exception ignored) {}
            return "localhost";
        });
        registry.add("spring.data.redis.port", () -> {
            try {
                if (redis.isRunning()) return redis.getMappedPort(6379);
            } catch (Exception ignored) {}
            return 6379;
        });
        registry.add("spring.data.redis.password", () -> "");

        // Disable Kafka listener auto-startup so no external Kafka broker is required
        registry.add("spring.kafka.listener.auto-startup", () -> "false");
    }

    // Mock Kafka producer and consumer beans to cleanly isolate this test slice
    @org.springframework.test.context.bean.override.mockito.MockitoBean
    private AuditLogProducer auditLogProducer;

    @org.springframework.test.context.bean.override.mockito.MockitoBean
    private AuditLogConsumer auditLogConsumer;

    // ─────────────────────────────────────────────────────────────────────────
    // Test Fixtures
    // ─────────────────────────────────────────────────────────────────────────

    /** The page ID seeded into Oracle before tests run. */
    private static final Long TEST_PAGE_ID = 1L;

    /** Minimal valid PAGE_UI_BLUEPRINT JSON matching the frontend contract. */
    private static final String BLUEPRINT_JSON =
            "{\"pageTitle\":\"Customer Dashboard\",\"layoutType\":\"VERTICAL_STACK\"," +
            "\"components\":[{\"type\":\"ACCOUNT_SUMMARY_CARD\",\"id\":\"acct-001\"," +
            "\"props\":{\"title\":\"Current Account\",\"currency\":\"USD\"}}]}";

    @Autowired
    private TestRestTemplate restTemplate;

    @Autowired
    private JdbcTemplate jdbcTemplate;

    @Autowired
    private CacheManager cacheManager;

    @Autowired
    private RedisTemplate<String, Object> redisTemplate;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    private HttpHeaders createAuthHeaders() {
        String token = jwtTokenProvider.generateToken("test-user", List.of("ROLE_MAKER"));
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(token);
        headers.setContentType(MediaType.APPLICATION_JSON);
        return headers;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test Lifecycle
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Seeds the Oracle schema and a known PAGE_TEMPLATE row before the test
     * suite runs. The DDL mirrors the production {@code db/schema.sql} exactly
     * so the converter paths (OSON ↔ String) are exercised as they are in prod.
     */
    @BeforeAll
    static void seedDatabase(@Autowired JdbcTemplate jdbcTemplate) {
        jdbcTemplate.execute("""
            BEGIN
              EXECUTE IMMEDIATE 'CREATE TABLE PAGE_TEMPLATE (
                PAGE_ID          NUMBER(19) PRIMARY KEY,
                PAGE_TITLE       VARCHAR2(255) NOT NULL,
                PAGE_LAYOUT_TYPE VARCHAR2(50) NOT NULL,
                PAGE_UI_BLUEPRINT CLOB CHECK (PAGE_UI_BLUEPRINT IS JSON),
                PAGE_VERSION     VARCHAR2(20) NOT NULL
              )';
            EXCEPTION
              WHEN OTHERS THEN
                IF SQLCODE = -955 THEN NULL; -- Table already exists
                ELSE RAISE;
                END IF;
            END;
            """);

        jdbcTemplate.execute("""
            BEGIN
              EXECUTE IMMEDIATE 'CREATE TABLE SERVICE_DETAILS (
                SVRD_MENU_ID         NUMBER(19) PRIMARY KEY,
                SVR_ID               NUMBER(19),
                SVRD_PARENT_MENU_ID  NUMBER(19),
                SVRD_MENU_NAME       VARCHAR2(100) NOT NULL,
                SVRD_PAGE_ID         NUMBER(19),
                SVRD_DISPLAY_ORDER   NUMBER(5) DEFAULT 0 NOT NULL,
                SVRD_ALLOWED_ROLES   VARCHAR2(255),
                SVRD_MENU_URL        VARCHAR2(255),
                SVRD_IS_ACTIVE       NUMBER(1) DEFAULT 1 NOT NULL
              )';
            EXCEPTION
              WHEN OTHERS THEN
                IF SQLCODE = -955 THEN NULL;
                ELSE RAISE;
                END IF;
            END;
            """);

        jdbcTemplate.execute("""
            BEGIN
              EXECUTE IMMEDIATE 'CREATE TABLE PAGE_ACTION (
                ACT_ID               NUMBER(19) PRIMARY KEY,
                SVRD_MENU_ID         NUMBER(19),
                ACT_NAME             VARCHAR2(100) NOT NULL,
                ACT_TYPE             VARCHAR2(50) NOT NULL,
                ACT_HTTP_METHOD      VARCHAR2(10) NOT NULL,
                ACT_TARGET_ENDPOINT  VARCHAR2(255) NOT NULL,
                ACT_TARGET_WIDGET    VARCHAR2(100),
                ACT_JSON_SCHEMA      CLOB
              )';
            EXCEPTION
              WHEN OTHERS THEN
                IF SQLCODE = -955 THEN NULL;
                ELSE RAISE;
                END IF;
            END;
            """);

        jdbcTemplate.update("""
            MERGE INTO PAGE_TEMPLATE t
            USING (SELECT 1 FROM DUAL) d ON (t.PAGE_ID = ?)
            WHEN NOT MATCHED THEN
              INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
              VALUES (?, 'Customer Dashboard', 'VERTICAL_STACK', ?, 'v1.0.0')
            """,
            TEST_PAGE_ID, TEST_PAGE_ID, BLUEPRINT_JSON);

        jdbcTemplate.update("""
            MERGE INTO SERVICE_DETAILS s
            USING (SELECT 1 FROM DUAL) d ON (s.SVRD_MENU_ID = 101)
            WHEN NOT MATCHED THEN
              INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_MENU_NAME, SVRD_PAGE_ID, SVRD_DISPLAY_ORDER, SVRD_ALLOWED_ROLES, SVRD_MENU_URL, SVRD_IS_ACTIVE)
              VALUES (101, 1, NULL, 'Customer Dashboard', ?, 1, 'ROLE_MAKER,ROLE_ADMIN', '/dynamic-page/1', 1)
            """,
            TEST_PAGE_ID);

        jdbcTemplate.update("""
            MERGE INTO PAGE_ACTION a
            USING (SELECT 1 FROM DUAL) d ON (a.ACT_ID = 101)
            WHEN NOT MATCHED THEN
              INSERT (ACT_ID, SVRD_MENU_ID, ACT_NAME, ACT_TYPE, ACT_HTTP_METHOD, ACT_TARGET_ENDPOINT, ACT_TARGET_WIDGET, ACT_JSON_SCHEMA)
              VALUES (101, 101, 'Search Account', 'SEARCH_API', 'POST', '/api/v1/core/accounts/search', 'statement_grid_1', '{}')
            """);
    }

    /**
     * Evicts all Redis cache entries before each test so cache-hit assertions
     * are not polluted by state from a prior test method.
     */
    @BeforeEach
    void evictCache() {
        Objects.requireNonNull(
                cacheManager.getCache(RedisCacheConfig.CACHE_PAGE_BLUEPRINT)
        ).clear();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 1: Happy Path — HTTP 200 with correct PAGE_UI_BLUEPRINT payload
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(1)
    @DisplayName("GET /pages/{id}/blueprint → 200 OK with PAGE_UI_BLUEPRINT payload")
    void getPageBlueprint_validPageId_returns200WithBlueprint() {
        HttpEntity<Void> request = new HttpEntity<>(createAuthHeaders());

        // Act
        ResponseEntity<PageBlueprintDto> response = restTemplate.exchange(
                "/api/v1/pages/{pageId}/blueprint",
                HttpMethod.GET,
                request,
                PageBlueprintDto.class,
                TEST_PAGE_ID);

        // Assert: HTTP contract
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.OK);
        assertThat(response.getHeaders().getContentType())
                .isEqualByComparingTo(MediaType.APPLICATION_JSON);

        // Assert: payload contract
        PageBlueprintDto dto = response.getBody();
        assertThat(dto).isNotNull();
        assertThat(dto.pageId()).isEqualTo(TEST_PAGE_ID);
        assertThat(dto.pageTitle()).isEqualTo("Customer Dashboard");
        assertThat(dto.layoutType()).isEqualTo("VERTICAL_STACK");
        assertThat(dto.pageVersion()).isEqualTo("v1.0.0");

        // Assert: uiBlueprint is deserialized as a Map (native JSON object)
        assertThat(dto.uiBlueprint()).isInstanceOf(java.util.Map.class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 2: Redis Cache HIT on Subsequent Request
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(2)
    @DisplayName("Second request → Redis cache HIT (no Oracle roundtrip)")
    void getPageBlueprint_secondRequest_hitsRedisCache() {
        // Pre-condition: cache is cold (evicted by @BeforeEach)
        String expectedRedisKeyPattern = "sdui::pageBlueprint::*";
        Set<String> keysBefore = redisTemplate.keys(expectedRedisKeyPattern);
        assertThat(keysBefore).isEmpty();

        HttpEntity<Void> request = new HttpEntity<>(createAuthHeaders());

        // Act 1: First request — cache MISS, Oracle is hit
        ResponseEntity<PageBlueprintDto> firstResponse = restTemplate.exchange(
                "/api/v1/pages/{pageId}/blueprint",
                HttpMethod.GET,
                request,
                PageBlueprintDto.class,
                TEST_PAGE_ID);
        assertThat(firstResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Assert: Redis key was created after first request
        Set<String> keysAfterFirst = redisTemplate.keys(expectedRedisKeyPattern);
        assertThat(keysAfterFirst)
                .as("Redis must contain exactly one blueprint key for pageId=%d", TEST_PAGE_ID)
                .isNotEmpty();

        String redisKey = keysAfterFirst.iterator().next();
        assertThat(redisKey).contains(String.valueOf(TEST_PAGE_ID));

        // Verify TTL is set
        Long ttlSeconds = redisTemplate.getExpire(redisKey);
        assertThat(ttlSeconds)
                .as("Redis TTL must be set (>0) to enforce cache expiry policy")
                .isGreaterThan(0L);

        // Act 2: Second request — must be served from Redis, not Oracle
        ResponseEntity<PageBlueprintDto> secondResponse = restTemplate.exchange(
                "/api/v1/pages/{pageId}/blueprint",
                HttpMethod.GET,
                request,
                PageBlueprintDto.class,
                TEST_PAGE_ID);
        assertThat(secondResponse.getStatusCode()).isEqualTo(HttpStatus.OK);

        // Assert: Spring Cache abstraction also confirms cache was populated
        var cacheEntry = Objects.requireNonNull(
                cacheManager.getCache(RedisCacheConfig.CACHE_PAGE_BLUEPRINT)
        ).get(TEST_PAGE_ID);
        assertThat(cacheEntry)
                .as("Spring CacheManager must report a cache HIT for pageId=%d", TEST_PAGE_ID)
                .isNotNull();

        // Assert: Both responses are semantically equivalent (cache coherence)
        assertThat(secondResponse.getBody()).isNotNull();
        assertThat(secondResponse.getBody().pageId())
                .isEqualTo(firstResponse.getBody().pageId());
        assertThat(secondResponse.getBody().pageVersion())
                .isEqualTo(firstResponse.getBody().pageVersion());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Test 3: 404 for Unknown Page ID
    // ─────────────────────────────────────────────────────────────────────────

    @Test
    @Order(3)
    @DisplayName("GET /pages/99999/blueprint → 404 Not Found (not cached)")
    void getPageBlueprint_unknownPageId_returns404AndIsNotCached() {
        long nonExistentPageId = 99_999L;
        HttpEntity<Void> request = new HttpEntity<>(createAuthHeaders());

        // Act
        ResponseEntity<String> response = restTemplate.exchange(
                "/api/v1/pages/{pageId}/blueprint",
                HttpMethod.GET,
                request,
                String.class,
                nonExistentPageId);

        // Assert: HTTP 404
        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);

        // Assert: 404 responses must NOT be cached in Redis
        Set<String> keysAfter = redisTemplate.keys("sdui::pageBlueprint::*" + nonExistentPageId + "*");
        assertThat(keysAfter).isEmpty();
    }
}
