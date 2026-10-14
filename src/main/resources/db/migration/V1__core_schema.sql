-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SDUI Forge — Phase 1: Core Schema DDL                                      ║
-- ║  Target: Oracle 23ai (JSON column native support)                           ║
-- ║  Project: Global_Page_Generator_True_SDUI                                   ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. SERVICE_DETAILS
--    Represents the hierarchical menu structure. Each row is a menu node that
--    may reference a parent (SVRD_PARENT_MENU_ID) and link to a page template
--    (SVRD_PAGE_ID). Roles are stored as a comma-separated string for ACL.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE SERVICE_DETAILS (
    SVRD_MENU_ID       NUMBER          GENERATED ALWAYS AS IDENTITY  CONSTRAINT PK_SERVICE_DETAILS PRIMARY KEY,
    SVR_ID             NUMBER          NOT NULL,
    SVRD_PARENT_MENU_ID NUMBER         DEFAULT NULL,
    SVRD_MENU_NAME     VARCHAR2(256)   NOT NULL,
    SVRD_ALLOWED_ROLES VARCHAR2(1024),
    SVRD_PAGE_ID       NUMBER,
    SVRD_IS_ACTIVE     NUMBER(1)       DEFAULT 1 NOT NULL
                                       CONSTRAINT CHK_SD_IS_ACTIVE CHECK (SVRD_IS_ACTIVE IN (0, 1)),

    -- Self-referencing FK for parent-child hierarchy
    CONSTRAINT FK_SD_PARENT
        FOREIGN KEY (SVRD_PARENT_MENU_ID)
        REFERENCES SERVICE_DETAILS (SVRD_MENU_ID)
);

-- Index on parent lookup — critical for hierarchical queries
CREATE INDEX IDX_SD_PARENT_MENU ON SERVICE_DETAILS (SVRD_PARENT_MENU_ID);

-- Index on page link — used in joins with PAGE_TEMPLATE
CREATE INDEX IDX_SD_PAGE_ID ON SERVICE_DETAILS (SVRD_PAGE_ID);

-- Index on active status filter
CREATE INDEX IDX_SD_IS_ACTIVE ON SERVICE_DETAILS (SVRD_IS_ACTIVE);

COMMENT ON TABLE  SERVICE_DETAILS IS 'Hierarchical menu tree linking services to page templates';
COMMENT ON COLUMN SERVICE_DETAILS.SVRD_MENU_ID       IS 'Primary key — unique menu node identifier';
COMMENT ON COLUMN SERVICE_DETAILS.SVR_ID              IS 'Foreign key to upstream SERVICE master (Phase 2 scope)';
COMMENT ON COLUMN SERVICE_DETAILS.SVRD_PARENT_MENU_ID IS 'Self-referencing FK to parent menu node (NULL = root)';
COMMENT ON COLUMN SERVICE_DETAILS.SVRD_MENU_NAME      IS 'Display name of the menu item';
COMMENT ON COLUMN SERVICE_DETAILS.SVRD_ALLOWED_ROLES  IS 'Comma-separated list of roles authorized to access this menu';
COMMENT ON COLUMN SERVICE_DETAILS.SVRD_PAGE_ID        IS 'FK to PAGE_TEMPLATE.PAGE_ID — the page this menu opens';
COMMENT ON COLUMN SERVICE_DETAILS.SVRD_IS_ACTIVE      IS 'Soft-delete flag: 1 = active, 0 = inactive';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. PAGE_TEMPLATE
--    Stores the SDUI page definition. PAGE_UI_BLUEPRINT holds the full JSON
--    blueprint that the frontend rendering engine consumes. Oracle 23ai native
--    JSON type stores this as binary OSON for optimal query performance.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE PAGE_TEMPLATE (
    PAGE_ID            NUMBER          GENERATED ALWAYS AS IDENTITY  CONSTRAINT PK_PAGE_TEMPLATE PRIMARY KEY,
    PAGE_TITLE         VARCHAR2(512)   NOT NULL,
    PAGE_LAYOUT_TYPE   VARCHAR2(128)   NOT NULL,
    PAGE_UI_BLUEPRINT  JSON            NOT NULL,
    PAGE_VERSION       VARCHAR2(32)    DEFAULT '1.0.0' NOT NULL
);

-- FK constraint on SERVICE_DETAILS → PAGE_TEMPLATE (deferred creation)
ALTER TABLE SERVICE_DETAILS
    ADD CONSTRAINT FK_SD_PAGE
    FOREIGN KEY (SVRD_PAGE_ID)
    REFERENCES PAGE_TEMPLATE (PAGE_ID);

COMMENT ON TABLE  PAGE_TEMPLATE IS 'SDUI page blueprints consumed by the frontend rendering engine';
COMMENT ON COLUMN PAGE_TEMPLATE.PAGE_ID            IS 'Primary key — unique page identifier';
COMMENT ON COLUMN PAGE_TEMPLATE.PAGE_TITLE         IS 'Human-readable page title';
COMMENT ON COLUMN PAGE_TEMPLATE.PAGE_LAYOUT_TYPE   IS 'Layout strategy: FORM, LIST, DASHBOARD, WIZARD, etc.';
COMMENT ON COLUMN PAGE_TEMPLATE.PAGE_UI_BLUEPRINT  IS 'Full JSON blueprint describing widgets, layout, bindings';
COMMENT ON COLUMN PAGE_TEMPLATE.PAGE_VERSION       IS 'Semantic version for cache-busting and audit trail';


-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. PAGE_ACTION
--    Defines the actions (API calls, navigations, widget mutations) that can
--    be triggered from a page. Linked to SERVICE_DETAILS via SVRD_MENU_ID.
--    ACT_JSON_SCHEMA holds the request/validation schema for the action payload.
-- ═══════════════════════════════════════════════════════════════════════════════
CREATE TABLE PAGE_ACTION (
    ACT_ID              NUMBER          GENERATED ALWAYS AS IDENTITY  CONSTRAINT PK_PAGE_ACTION PRIMARY KEY,
    SVRD_MENU_ID        NUMBER          NOT NULL,
    ACT_NAME            VARCHAR2(256)   NOT NULL,
    ACT_TYPE            VARCHAR2(64)    NOT NULL,
    ACT_HTTP_METHOD     VARCHAR2(10),
    ACT_TARGET_ENDPOINT VARCHAR2(1024),
    ACT_TARGET_WIDGET   VARCHAR2(256),
    ACT_JSON_SCHEMA     JSON,

    CONSTRAINT FK_PA_MENU
        FOREIGN KEY (SVRD_MENU_ID)
        REFERENCES SERVICE_DETAILS (SVRD_MENU_ID)
);

-- Index on menu linkage — used in action lookups per page
CREATE INDEX IDX_PA_MENU_ID ON PAGE_ACTION (SVRD_MENU_ID);

COMMENT ON TABLE  PAGE_ACTION IS 'Actions (API calls, navigations) available on an SDUI page';
COMMENT ON COLUMN PAGE_ACTION.ACT_ID              IS 'Primary key — unique action identifier';
COMMENT ON COLUMN PAGE_ACTION.SVRD_MENU_ID        IS 'FK to SERVICE_DETAILS — which menu context owns this action';
COMMENT ON COLUMN PAGE_ACTION.ACT_NAME            IS 'Logical action name displayed in the UI';
COMMENT ON COLUMN PAGE_ACTION.ACT_TYPE            IS 'Action category: API_CALL, NAVIGATE, REFRESH, SUBMIT, etc.';
COMMENT ON COLUMN PAGE_ACTION.ACT_HTTP_METHOD     IS 'HTTP verb: GET, POST, PUT, DELETE (nullable for non-API actions)';
COMMENT ON COLUMN PAGE_ACTION.ACT_TARGET_ENDPOINT IS 'Target URL or API path invoked by this action';
COMMENT ON COLUMN PAGE_ACTION.ACT_TARGET_WIDGET   IS 'Widget ID in the blueprint that this action targets';
COMMENT ON COLUMN PAGE_ACTION.ACT_JSON_SCHEMA     IS 'JSON Schema defining the action payload structure and validation';
