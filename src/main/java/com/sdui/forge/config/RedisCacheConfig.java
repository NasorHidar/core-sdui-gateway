package com.sdui.forge.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.cache.CacheManager;
import org.springframework.cache.annotation.EnableCaching;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.redis.cache.RedisCacheConfiguration;
import org.springframework.data.redis.cache.RedisCacheManager;
import org.springframework.data.redis.connection.RedisConnectionFactory;
import org.springframework.data.redis.serializer.GenericJackson2JsonRedisSerializer;
import org.springframework.data.redis.serializer.RedisSerializationContext;
import org.springframework.data.redis.serializer.StringRedisSerializer;

import java.time.Duration;
import java.util.Map;

/**
 * Redis cache configuration for the SDUI gateway.
 *
 * <p>Design decisions:
 * <ul>
 *     <li><b>Named caches with distinct TTLs</b> — blueprints (hot path) get 30-min TTL;
 *         menu trees (relatively static) get 60-min TTL.</li>
 *     <li><b>JSON serialization</b> — cached objects are serialized as JSON for
 *         debuggability and cross-service interoperability.</li>
 *     <li><b>Key prefixing</b> — all keys prefixed with {@code sdui::<cacheName>::}
 *         to avoid collisions in shared Redis clusters.</li>
 *     <li><b>No null caching</b> — prevents cache pollution from missing pages
 *         that might be added later.</li>
 * </ul>
 */
@Configuration
@EnableCaching
public class RedisCacheConfig {

    private static final Logger log = LoggerFactory.getLogger(RedisCacheConfig.class);

    /** Cache name for page blueprints. Used in @Cacheable annotations. */
    public static final String CACHE_PAGE_BLUEPRINT = "pageBlueprint";

    /** Cache name for the menu tree. */
    public static final String CACHE_MENU_TREE = "menuTree";

    @Bean
    public CacheManager cacheManager(RedisConnectionFactory connectionFactory) {
        log.info("Initializing Redis CacheManager with per-cache TTL policies");

        // Default config — used for any cache not explicitly configured below
        RedisCacheConfiguration defaultConfig = RedisCacheConfiguration.defaultCacheConfig()
                .entryTtl(Duration.ofMinutes(30))
                .disableCachingNullValues()
                .serializeKeysWith(
                        RedisSerializationContext.SerializationPair
                                .fromSerializer(new StringRedisSerializer()))
                .serializeValuesWith(
                        RedisSerializationContext.SerializationPair
                                .fromSerializer(new GenericJackson2JsonRedisSerializer()))
                .prefixCacheNameWith("sdui::");

        // Per-cache TTL overrides
        Map<String, RedisCacheConfiguration> cacheConfigurations = Map.of(
                CACHE_PAGE_BLUEPRINT, defaultConfig.entryTtl(Duration.ofMinutes(30)),
                CACHE_MENU_TREE, defaultConfig.entryTtl(Duration.ofMinutes(60))
        );

        return RedisCacheManager.builder(connectionFactory)
                .cacheDefaults(defaultConfig)
                .withInitialCacheConfigurations(cacheConfigurations)
                .transactionAware()   // align cache ops with Spring @Transactional
                .build();
    }

    @Bean
    public org.springframework.data.redis.core.RedisTemplate<String, Object> redisTemplate(RedisConnectionFactory connectionFactory) {
        org.springframework.data.redis.core.RedisTemplate<String, Object> template = new org.springframework.data.redis.core.RedisTemplate<>();
        template.setConnectionFactory(connectionFactory);
        template.setKeySerializer(new StringRedisSerializer());
        template.setValueSerializer(new GenericJackson2JsonRedisSerializer());
        return template;
    }
}
