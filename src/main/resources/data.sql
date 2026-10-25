-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SDUI Forge — Baseline & Rich Seed Data (data.sql)                          ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

-- 1. Users
MERGE INTO USERS t USING (SELECT 1 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_IS_ACTIVE)
VALUES (1, 'maker_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 1);

MERGE INTO USERS t USING (SELECT 2 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_IS_ACTIVE)
VALUES (2, 'checker_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 1);

MERGE INTO USERS t USING (SELECT 3 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_IS_ACTIVE)
VALUES (3, 'admin_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 1);

MERGE INTO USERS t USING (SELECT 4 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_IS_ACTIVE)
VALUES (4, 'auditor_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 1);

-- 2. Services
MERGE INTO SERVICE t USING (SELECT 1 AS SVR_ID FROM DUAL) s ON (t.SVR_ID = s.SVR_ID)
WHEN NOT MATCHED THEN INSERT (SVR_ID, SVR_NAME, SVR_ICON_URL, SVR_BASE_API_URL, SVR_IS_ACTIVE, SVR_SORT_ORDER)
VALUES (1, 'Retail Core Banking', '/icons/retail.svg', '/api/v1/core/retail', 1, 1);

MERGE INTO SERVICE t USING (SELECT 2 AS SVR_ID FROM DUAL) s ON (t.SVR_ID = s.SVR_ID)
WHEN NOT MATCHED THEN INSERT (SVR_ID, SVR_NAME, SVR_ICON_URL, SVR_BASE_API_URL, SVR_IS_ACTIVE, SVR_SORT_ORDER)
VALUES (2, 'Cards & Electronic Payments', '/icons/cards.svg', '/api/v1/core/cards', 1, 2);

MERGE INTO SERVICE t USING (SELECT 3 AS SVR_ID FROM DUAL) s ON (t.SVR_ID = s.SVR_ID)
WHEN NOT MATCHED THEN INSERT (SVR_ID, SVR_NAME, SVR_ICON_URL, SVR_BASE_API_URL, SVR_IS_ACTIVE, SVR_SORT_ORDER)
VALUES (3, 'Lending & Credit Facilities', '/icons/lending.svg', '/api/v1/core/lending', 1, 3);

-- 3. Page Templates
MERGE INTO PAGE_TEMPLATE t USING (SELECT 1 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    1,
    'Customer Dashboard',
    'VERTICAL_STACK',
    '{"pageTitle":"Customer Dashboard","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"info_card_1","props":{"title":"Account Overview","content":"Welcome to Core Banking SDUI Gateway. Live session authenticated. Available balance: $45,280.50 USD."}},{"type":"Skeleton_Form","id":"search_form_1","props":{"title":"Account Lookup","fields":[{"name":"accountNo","label":"Account Number","inputType":"text","required":true,"placeholder":"e.g. 1234567890","rules":[{"type":"required","value":true,"message":"Account number is required"},{"type":"minLength","value":6,"message":"Must be at least 6 digits"}]},{"name":"branchCode","label":"Branch Code","inputType":"text","required":false,"placeholder":"e.g. BR001"}],"actionId":101}},{"type":"Skeleton_Grid","id":"statement_grid_1","props":{"title":"Account Statement"}}]}',
    'v1.0.0'
);

MERGE INTO PAGE_TEMPLATE t USING (SELECT 101 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    101,
    'Customer Dashboard',
    'VERTICAL_STACK',
    '{"pageTitle":"Customer Dashboard","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"info_card_1","props":{"title":"Account Overview","content":"Welcome to Core Banking SDUI Gateway. Live session authenticated. Available balance: $45,280.50 USD."}},{"type":"Skeleton_Form","id":"search_form_1","props":{"title":"Account Lookup","fields":[{"name":"accountNo","label":"Account Number","inputType":"text","required":true,"placeholder":"e.g. 1234567890","rules":[{"type":"required","value":true,"message":"Account number is required"},{"type":"minLength","value":6,"message":"Must be at least 6 digits"}]},{"name":"branchCode","label":"Branch Code","inputType":"text","required":false,"placeholder":"e.g. BR001"}],"actionId":101}},{"type":"Skeleton_Grid","id":"statement_grid_1","props":{"title":"Account Statement"}}]}',
    'v1.0.0'
);

MERGE INTO PAGE_TEMPLATE t USING (SELECT 102 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    102,
    'Fund Transfer Portal',
    'VERTICAL_STACK',
    '{"pageTitle":"Fund Transfer Portal","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"transfer_alert","props":{"title":"Notice","content":"Daily inter-bank settlement limit is $50,000.00."}},{"type":"Skeleton_Form","id":"transfer_form_1","props":{"title":"Transfer Initiation","fields":[{"name":"sourceAccount","label":"Source Account","inputType":"text","required":true,"placeholder":"Source Account"},{"name":"destAccount","label":"Beneficiary Account","inputType":"text","required":true,"placeholder":"Recipient Account"},{"name":"amount","label":"Amount (USD)","inputType":"number","required":true,"placeholder":"0.00"}],"actionId":102}}]}',
    'v1.0.0'
);

MERGE INTO PAGE_TEMPLATE t USING (SELECT 103 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    103,
    'Transaction History',
    'VERTICAL_STACK',
    '{"pageTitle":"Transaction History & Audit","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"history_summary","props":{"title":"Audit Filter","content":"Showing settled ledger transactions."}},{"type":"Skeleton_Grid","id":"history_grid_1","props":{"title":"Cleared Ledger Entries"}}]}',
    'v1.0.0'
);

MERGE INTO PAGE_TEMPLATE t USING (SELECT 999 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    999,
    'Fallback Demo',
    'VERTICAL_STACK',
    '{"pageTitle":"Fallback Demo","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"card_ok","props":{"title":"Healthy Widget Card","content":"This component is properly registered."}},{"type":"Unregistered_Widget","id":"broken_widget","props":{}}]}',
    'v1.0.0'
);

-- 4. Service Details (Menu)
MERGE INTO SERVICE_DETAILS t USING (SELECT 1 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (1, 1, NULL, 1, 'Core Banking Menu', 'MENU_ROOT', '/dynamic-page/101', 'ROOT', 'ADMIN,MAKER,CHECKER,AUDITOR', 101, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 101 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (101, 1, 1, 1, 'Customer Dashboard', 'DASHBOARD_101', '/dynamic-page/101', 'LEAF', 'ADMIN,MAKER,CHECKER,AUDITOR', 101, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 102 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (102, 1, 1, 2, 'Fund Transfer', 'TRANSFER_102', '/dynamic-page/102', 'LEAF', 'ADMIN,MAKER', 102, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 103 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (103, 1, 1, 3, 'Transaction History', 'HISTORY_103', '/dynamic-page/103', 'LEAF', 'ADMIN,MAKER,CHECKER,AUDITOR', 103, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 999 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (999, 1, 1, 9, 'Fallback Demo', 'FALLBACK_999', '/dynamic-page/999', 'LEAF', 'ADMIN,MAKER,CHECKER', 999, 1);

-- 5. Page Actions
MERGE INTO PAGE_ACTION t USING (SELECT 101 AS ACT_ID FROM DUAL) s ON (t.ACT_ID = s.ACT_ID)
WHEN NOT MATCHED THEN INSERT (ACT_ID, SVRD_MENU_ID, ACT_NAME, ACT_TYPE, ACT_HTTP_METHOD, ACT_TARGET_ENDPOINT, ACT_TARGET_WIDGET, ACT_JSON_SCHEMA, ACT_DISPLAY_ORDER)
VALUES (
    101,
    101,
    'Search Account',
    'SEARCH_API',
    'POST',
    '/api/v1/core/accounts/search',
    'statement_grid_1',
    '{"type":"object","properties":{"accountNo":{"type":"string"},"branchCode":{"type":"string"}},"required":["accountNo"]}',
    1
);

MERGE INTO PAGE_ACTION t USING (SELECT 102 AS ACT_ID FROM DUAL) s ON (t.ACT_ID = s.ACT_ID)
WHEN NOT MATCHED THEN INSERT (ACT_ID, SVRD_MENU_ID, ACT_NAME, ACT_TYPE, ACT_HTTP_METHOD, ACT_TARGET_ENDPOINT, ACT_TARGET_WIDGET, ACT_JSON_SCHEMA, ACT_DISPLAY_ORDER)
VALUES (
    102,
    102,
    'Execute Fund Transfer',
    'BUSINESS_API',
    'POST',
    '/api/v1/core/transfers/execute',
    'transfer_alert',
    '{"type":"object","properties":{"sourceAccount":{"type":"string"},"destAccount":{"type":"string"},"amount":{"type":"number"}},"required":["sourceAccount","destAccount","amount"]}',
    1
);

COMMIT;
