package com.sdui.forge.security;

import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.*;

/**
 * JWT token provider — generates, parses, and validates JWTs.
 *
 * <p>Uses JJWT 0.12.x with HMAC-SHA256 signing. The secret key is injected
 * from externalized configuration ({@code sdui.jwt.secret}) and MUST be at
 * least 256 bits in production.</p>
 *
 * <p>Thread-safe: all state is final after construction. The {@link JwtParser}
 * is built once and reused across virtual threads.</p>
 */
@Component
public class JwtTokenProvider {

    private static final Logger log = LoggerFactory.getLogger(JwtTokenProvider.class);

    private final SecretKey signingKey;
    private final long expirationMs;
    private final String issuer;
    private final JwtParser jwtParser;

    public JwtTokenProvider(
            @Value("${sdui.jwt.secret}") String secret,
            @Value("${sdui.jwt.expiration-ms}") long expirationMs,
            @Value("${sdui.jwt.issuer}") String issuer) {
        this.signingKey = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
        this.expirationMs = expirationMs;
        this.issuer = issuer;
        this.jwtParser = Jwts.parser()
                .verifyWith(signingKey)
                .requireIssuer(issuer)
                .build();
    }

    /**
     * Generates a signed JWT containing subject (user ID) and roles.
     *
     * @param userId the authenticated user's identifier
     * @param roles  comma-separated or collection of role strings
     * @return compact JWS string
     */
    public String generateToken(String userId, Collection<String> roles) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + expirationMs);

        return Jwts.builder()
                .subject(userId)
                .issuer(issuer)
                .issuedAt(now)
                .expiration(expiry)
                .claim("roles", roles)
                .signWith(signingKey, Jwts.SIG.HS256)
                .compact();
    }

    /**
     * Extracts the subject (user ID) from a validated token.
     */
    public String getUserId(String token) {
        return parseClaims(token).getSubject();
    }

    /**
     * Extracts roles from the JWT claims.
     *
     * @return list of role strings (e.g., ROLE_MAKER, ROLE_CHECKER)
     */
    @SuppressWarnings("unchecked")
    public List<String> getRoles(String token) {
        Object roles = parseClaims(token).get("roles");
        if (roles instanceof List<?> list) {
            return list.stream()
                    .map(Object::toString)
                    .toList();
        }
        return Collections.emptyList();
    }

    /**
     * Validates the token structure, signature, expiration, and issuer.
     *
     * @return true if the token is valid and not expired
     */
    public boolean validateToken(String token) {
        try {
            jwtParser.parseSignedClaims(token);
            return true;
        } catch (ExpiredJwtException e) {
            log.warn("JWT expired: {}", e.getMessage());
        } catch (UnsupportedJwtException e) {
            log.warn("JWT unsupported: {}", e.getMessage());
        } catch (MalformedJwtException e) {
            log.warn("JWT malformed: {}", e.getMessage());
        } catch (SecurityException e) {
            log.warn("JWT signature validation failed: {}", e.getMessage());
        } catch (IllegalArgumentException e) {
            log.warn("JWT claims string is empty: {}", e.getMessage());
        }
        return false;
    }

    private Claims parseClaims(String token) {
        return jwtParser.parseSignedClaims(token).getPayload();
    }
}
