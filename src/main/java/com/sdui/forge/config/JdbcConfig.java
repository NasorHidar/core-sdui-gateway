package com.sdui.forge.config;

import org.springframework.context.annotation.Configuration;
import org.springframework.data.jdbc.repository.config.AbstractJdbcConfiguration;
import org.springframework.core.convert.converter.Converter;
import org.springframework.data.jdbc.core.convert.JdbcCustomConversions;

import java.util.List;

/**
 * Spring Data JDBC configuration.
 *
 * <p>Registers custom converters to handle Oracle's native JSON column type.
 * Oracle JDBC may return JSON columns as {@code oracle.sql.json.OracleJsonValue}
 * (binary OSON). This converter ensures transparent String ↔ OracleJson conversion
 * so the domain entities can work with plain {@code String} fields.</p>
 *
 * <p>If the Oracle driver returns JSON as String directly (depends on driver
 * version and JDBC metadata), these converters act as safe no-ops.</p>
 */
@Configuration
public class JdbcConfig extends AbstractJdbcConfiguration {

    @Override
    public JdbcCustomConversions jdbcCustomConversions() {
        return new JdbcCustomConversions(List.of(
                new OracleJsonReadConverter(),
                new OracleJsonWriteConverter()
        ));
    }

    /**
     * Reads Oracle JSON column values (which may arrive as byte[], OSON objects,
     * or String) and normalizes them to {@code String}.
     */
    @org.springframework.data.convert.ReadingConverter
    static class OracleJsonReadConverter implements Converter<Object, String> {

        @Override
        public String convert(Object source) {
            if (source == null) {
                return null;
            }
            // Oracle JDBC may return:
            //  - String (simple case)
            //  - byte[] (OSON binary)
            //  - OracleJsonValue (oracle.sql.json hierarchy)
            // For all cases, toString() produces valid JSON text.
            if (source instanceof String str) {
                return str;
            }
            if (source instanceof byte[] bytes) {
                return new String(bytes, java.nio.charset.StandardCharsets.UTF_8);
            }
            // OracleJsonValue.toString() returns JSON text
            return source.toString();
        }
    }

    /**
     * Writes String values to Oracle JSON columns.
     *
     * <p>The Oracle JDBC driver's JSON-aware PreparedStatement handling
     * accepts String input for JSON columns transparently.</p>
     */
    @org.springframework.data.convert.WritingConverter
    static class OracleJsonWriteConverter implements Converter<String, String> {

        @Override
        public String convert(String source) {
            return source;
        }
    }
}
