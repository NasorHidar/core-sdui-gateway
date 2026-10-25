-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SDUI Forge — Phase 4: Activity Log Table (CLOB payload)                    ║
-- ║  Populated asynchronously by AuditLogConsumer (Kafka -> Oracle).            ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE TABLE ACTIVITY_LOG (
    ACT_LOG_ID            NUMBER          GENERATED ALWAYS AS IDENTITY  CONSTRAINT PK_ACTIVITY_LOG PRIMARY KEY,
    ACT_LOG_EVENT_ID      VARCHAR2(64)    NOT NULL,
    ACT_LOG_USER_ID       VARCHAR2(64)    NOT NULL,
    ACT_LOG_ACTION        VARCHAR2(256)   NOT NULL,
    ACT_LOG_REFERENCE_KEY VARCHAR2(256),
    ACT_LOG_PAYLOAD       CLOB,
    ACT_LOG_SOURCE_IP     VARCHAR2(64),
    ACT_LOG_CREATED_AT    TIMESTAMP(6)    DEFAULT SYSTIMESTAMP NOT NULL
);

-- Idempotency: producer assigns a UUID per event; the consumer dedupes on it.
CREATE UNIQUE INDEX IDX_ACT_LOG_EVENT_ID ON ACTIVITY_LOG (ACT_LOG_EVENT_ID);

-- Query patterns: by user, by action, by reference.
CREATE INDEX IDX_ACT_LOG_USER_ID     ON ACTIVITY_LOG (ACT_LOG_USER_ID);
CREATE INDEX IDX_ACT_LOG_ACTION      ON ACTIVITY_LOG (ACT_LOG_ACTION);
CREATE INDEX IDX_ACT_LOG_REFERENCE   ON ACTIVITY_LOG (ACT_LOG_REFERENCE_KEY);
CREATE INDEX IDX_ACT_LOG_CREATED_AT  ON ACTIVITY_LOG (ACT_LOG_CREATED_AT);

COMMENT ON TABLE  ACTIVITY_LOG                    IS 'Async audit trail; payload stored as CLOB to handle multi-MB business payloads';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_ID         IS 'Identity PK';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_EVENT_ID   IS 'UUID assigned at publish time — guarantees idempotent consumer processing';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_USER_ID    IS 'Authenticated user who triggered the action';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_ACTION     IS 'Business action name (ACCOUNT_SEARCH, TRANSFER, ...)';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_REFERENCE_KEY IS 'Business reference (account number, transaction id, ...)';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_PAYLOAD    IS 'Full request/response JSON payload — CLOB for large bodies';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_SOURCE_IP  IS 'Originating client IP';
COMMENT ON COLUMN ACTIVITY_LOG.ACT_LOG_CREATED_AT IS 'Event timestamp (set at publish; defaults to SYSTIMESTAMP as a backstop)';
