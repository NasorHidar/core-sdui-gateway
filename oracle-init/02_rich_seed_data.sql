-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║  SDUI Forge — Enterprise Core Banking Seed Data Pack                        ║
-- ║  Schema Owner: SDUI_ADMIN | Database: Oracle 23ai                           ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

SET DEFINE OFF;
ALTER SESSION SET CURRENT_SCHEMA = sdui_admin;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. USERS: Banking Security & Role Personas
-- ═══════════════════════════════════════════════════════════════════════════════
MERGE INTO USERS t USING (SELECT 1 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_API_TOKEN, USR_TOKEN_EXPIRY, USR_IS_ACTIVE, USR_CREATED_AT)
VALUES (1, 'maker_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'jwt_mock_token_maker_7718', SYSTIMESTAMP + INTERVAL '30' DAY, 1, SYSTIMESTAMP);

MERGE INTO USERS t USING (SELECT 2 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_API_TOKEN, USR_TOKEN_EXPIRY, USR_IS_ACTIVE, USR_CREATED_AT)
VALUES (2, 'checker_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'jwt_mock_token_checker_8829', SYSTIMESTAMP + INTERVAL '30' DAY, 1, SYSTIMESTAMP);

MERGE INTO USERS t USING (SELECT 3 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_API_TOKEN, USR_TOKEN_EXPIRY, USR_IS_ACTIVE, USR_CREATED_AT)
VALUES (3, 'admin_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'jwt_mock_token_admin_9930', SYSTIMESTAMP + INTERVAL '30' DAY, 1, SYSTIMESTAMP);

MERGE INTO USERS t USING (SELECT 4 AS USR_ID FROM DUAL) s ON (t.USR_ID = s.USR_ID)
WHEN NOT MATCHED THEN INSERT (USR_ID, USR_LOGIN_ID, USR_PASSWORD_HASH, USR_API_TOKEN, USR_TOKEN_EXPIRY, USR_IS_ACTIVE, USR_CREATED_AT)
VALUES (4, 'auditor_user', '$2a$10$dXJ3SW6G7P50lGmMkkmwe.20cQQubK3.HZWzG3YB1tlRy.fqvM/BG', 'jwt_mock_token_audit_1102', SYSTIMESTAMP + INTERVAL '30' DAY, 1, SYSTIMESTAMP);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. SERVICE: Core Business Service Catalog
-- ═══════════════════════════════════════════════════════════════════════════════
MERGE INTO SERVICE t USING (SELECT 1 AS SVR_ID FROM DUAL) s ON (t.SVR_ID = s.SVR_ID)
WHEN NOT MATCHED THEN INSERT (SVR_ID, SVR_NAME, SVR_ICON_URL, SVR_BASE_API_URL, SVR_IS_ACTIVE, SVR_SORT_ORDER)
VALUES (1, 'Retail Core Banking', '/icons/retail.svg', '/api/v1/core/retail', 1, 1);

MERGE INTO SERVICE t USING (SELECT 2 AS SVR_ID FROM DUAL) s ON (t.SVR_ID = s.SVR_ID)
WHEN NOT MATCHED THEN INSERT (SVR_ID, SVR_NAME, SVR_ICON_URL, SVR_BASE_API_URL, SVR_IS_ACTIVE, SVR_SORT_ORDER)
VALUES (2, 'Cards & Electronic Payments', '/icons/cards.svg', '/api/v1/core/cards', 1, 2);

MERGE INTO SERVICE t USING (SELECT 3 AS SVR_ID FROM DUAL) s ON (t.SVR_ID = s.SVR_ID)
WHEN NOT MATCHED THEN INSERT (SVR_ID, SVR_NAME, SVR_ICON_URL, SVR_BASE_API_URL, SVR_IS_ACTIVE, SVR_SORT_ORDER)
VALUES (3, 'Lending & Credit Facilities', '/icons/lending.svg', '/api/v1/core/lending', 1, 3);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. PAGE_TEMPLATE: Production SDUI UI Blueprints (JSON)
-- ═══════════════════════════════════════════════════════════════════════════════

-- Page 1: Default Primary Dashboard
MERGE INTO PAGE_TEMPLATE t USING (SELECT 1 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    1,
    'Customer Dashboard',
    'VERTICAL_STACK',
    '{"pageTitle":"Customer Dashboard","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"info_card_1","props":{"title":"Account Overview","content":"Welcome to Core Banking SDUI Gateway. Live session authenticated. Available balance: $45,280.50 USD."}},{"type":"Skeleton_Form","id":"search_form_1","props":{"title":"Account Lookup","fields":[{"name":"accountNo","label":"Account Number","inputType":"text","required":true,"placeholder":"e.g. 1234567890","rules":[{"type":"required","value":true,"message":"Account number is required"},{"type":"minLength","value":6,"message":"Must be at least 6 digits"}]},{"name":"branchCode","label":"Branch Code","inputType":"text","required":false,"placeholder":"e.g. BR001"}],"actionId":101}},{"type":"Skeleton_Grid","id":"statement_grid_1","props":{"title":"Account Statement"}}]}',
    'v1.0.0'
);

-- Page 101: Customer Dashboard Alias
MERGE INTO PAGE_TEMPLATE t USING (SELECT 101 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    101,
    'Customer Dashboard',
    'VERTICAL_STACK',
    '{"pageTitle":"Customer Dashboard","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"info_card_1","props":{"title":"Account Overview","content":"Welcome to Core Banking SDUI Gateway. Live session authenticated. Available balance: $45,280.50 USD."}},{"type":"Skeleton_Form","id":"search_form_1","props":{"title":"Account Lookup","fields":[{"name":"accountNo","label":"Account Number","inputType":"text","required":true,"placeholder":"e.g. 1234567890","rules":[{"type":"required","value":true,"message":"Account number is required"},{"type":"minLength","value":6,"message":"Must be at least 6 digits"}]},{"name":"branchCode","label":"Branch Code","inputType":"text","required":false,"placeholder":"e.g. BR001"}],"actionId":101}},{"type":"Skeleton_Grid","id":"statement_grid_1","props":{"title":"Account Statement"}}]}',
    'v1.0.0'
);

-- Page 102: Fund Transfer Initiation
MERGE INTO PAGE_TEMPLATE t USING (SELECT 102 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    102,
    'Fund Transfer Portal',
    'VERTICAL_STACK',
    '{"pageTitle":"Fund Transfer Portal","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"transfer_alert","props":{"title":"Notice","content":"Daily inter-bank settlement limit is $50,000.00. Transfers after 16:00 EST process next banking day."}},{"type":"Skeleton_Form","id":"transfer_form_1","props":{"title":"Transfer Initiation","fields":[{"name":"sourceAccount","label":"Source Account","inputType":"text","required":true,"placeholder":"Source Account (e.g., 100293847)"},{"name":"destAccount","label":"Beneficiary Account","inputType":"text","required":true,"placeholder":"Recipient Account (e.g., 992837461)"},{"name":"swiftCode","label":"SWIFT / BIC Code","inputType":"text","required":false,"placeholder":"e.g. CHASUS33"},{"name":"amount","label":"Transfer Amount (USD)","inputType":"number","required":true,"placeholder":"0.00"}],"actionId":102}}]}',
    'v1.0.0'
);

-- Page 103: Transaction History & Statement Grid
MERGE INTO PAGE_TEMPLATE t USING (SELECT 103 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    103,
    'Transaction History',
    'VERTICAL_STACK',
    '{"pageTitle":"Transaction History & Audit","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"history_summary","props":{"title":"Audit Filter","content":"Showing settled ledger transactions for Fiscal Q4."}},{"type":"Skeleton_Grid","id":"history_grid_1","props":{"title":"Cleared Ledger Entries"}}]}',
    'v1.0.0'
);

-- Page 104: Cards & Electronic Payment Controls
MERGE INTO PAGE_TEMPLATE t USING (SELECT 104 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    104,
    'Card Controls & Limits',
    'VERTICAL_STACK',
    '{"pageTitle":"Card Controls & Security","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"card_spec_card","props":{"title":"Corporate Visa Debit (••• 4821)","content":"Status: ACTIVE | Daily POS Limit: $5,000 | Contactless: ENABLED"}},{"type":"Skeleton_Form","id":"card_settings_form","props":{"title":"Security Preferences","fields":[{"name":"cardPin","label":"New ATM PIN (4 digits)","inputType":"password","required":true,"placeholder":"••••"},{"name":"intlUsage","label":"Allow International Transactions (Y/N)","inputType":"text","required":false,"placeholder":"Y or N"}],"actionId":104}}]}',
    'v1.0.0'
);

-- Page 105: Loan Facilities
MERGE INTO PAGE_TEMPLATE t USING (SELECT 105 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    105,
    'Lending Facility Inquiry',
    'VERTICAL_STACK',
    '{"pageTitle":"Commercial Lending Inquiry","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"rates_notice","props":{"title":"Commercial APR Notice","content":"Benchmark Prime Rate + 1.75% applies for term facilities up to 60 months."}},{"type":"Skeleton_Form","id":"loan_calc_form","props":{"title":"Loan Calculator","fields":[{"name":"facilityAmount","label":"Requested Amount ($)","inputType":"number","required":true,"placeholder":"100000"},{"name":"termMonths","label":"Amortization Term (Months)","inputType":"number","required":true,"placeholder":"36"}],"actionId":105}}]}',
    'v1.0.0'
);

-- Page 999: Fallback & Error Boundary Demonstration
MERGE INTO PAGE_TEMPLATE t USING (SELECT 999 AS PAGE_ID FROM DUAL) s ON (t.PAGE_ID = s.PAGE_ID)
WHEN NOT MATCHED THEN INSERT (PAGE_ID, PAGE_TITLE, PAGE_LAYOUT_TYPE, PAGE_UI_BLUEPRINT, PAGE_VERSION)
VALUES (
    999,
    'Fallback & Resilience Demo',
    'VERTICAL_STACK',
    '{"pageTitle":"Fallback & Resilience Demo","layoutType":"VERTICAL_STACK","components":[{"type":"Skeleton_Card","id":"card_ok","props":{"title":"Healthy Widget Card","content":"This component is properly registered in componentRegistry.js and renders cleanly."}},{"type":"Unregistered_Crypto_Widget","id":"broken_widget_test","props":{"coin":"BTC"}}]}',
    'v1.0.0'
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SERVICE_DETAILS: Hierarchical Navigation Tree
-- ═══════════════════════════════════════════════════════════════════════════════
-- Root Node
MERGE INTO SERVICE_DETAILS t USING (SELECT 1 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (1, 1, NULL, 1, 'Core Banking Portal', 'MENU_ROOT', '/dynamic-page/101', 'ROOT', 'ADMIN,MAKER,CHECKER,AUDITOR', 101, 1);

-- Sub-menus
MERGE INTO SERVICE_DETAILS t USING (SELECT 101 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (101, 1, 1, 1, 'Customer Dashboard', 'DASHBOARD_101', '/dynamic-page/101', 'LEAF', 'ADMIN,MAKER,CHECKER,AUDITOR', 101, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 102 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (102, 1, 1, 2, 'Fund Transfer', 'TRANSFER_102', '/dynamic-page/102', 'LEAF', 'ADMIN,MAKER', 102, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 103 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (103, 1, 1, 3, 'Transaction History', 'HISTORY_103', '/dynamic-page/103', 'LEAF', 'ADMIN,MAKER,CHECKER,AUDITOR', 103, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 104 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (104, 2, 1, 4, 'Card Controls', 'CARDS_104', '/dynamic-page/104', 'LEAF', 'ADMIN,MAKER,CHECKER', 104, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 105 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (105, 3, 1, 5, 'Lending Calculator', 'LENDING_105', '/dynamic-page/105', 'LEAF', 'ADMIN,MAKER', 105, 1);

MERGE INTO SERVICE_DETAILS t USING (SELECT 999 AS SVRD_MENU_ID FROM DUAL) s ON (t.SVRD_MENU_ID = s.SVRD_MENU_ID)
WHEN NOT MATCHED THEN INSERT (SVRD_MENU_ID, SVR_ID, SVRD_PARENT_MENU_ID, SVRD_DISPLAY_ORDER, SVRD_MENU_NAME, SVRD_MENU_CODE, SVRD_MENU_URL, SVRD_MENU_TYPE, SVRD_ALLOWED_ROLES, SVRD_PAGE_ID, SVRD_IS_ACTIVE)
VALUES (999, 1, 1, 9, 'Fallback Demo', 'FALLBACK_999', '/dynamic-page/999', 'LEAF', 'ADMIN,MAKER,CHECKER', 999, 1);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. PAGE_ACTION: Dynamic Actions & Event Handlers
-- ═══════════════════════════════════════════════════════════════════════════════
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

MERGE INTO PAGE_ACTION t USING (SELECT 103 AS ACT_ID FROM DUAL) s ON (t.ACT_ID = s.ACT_ID)
WHEN NOT MATCHED THEN INSERT (ACT_ID, SVRD_MENU_ID, ACT_NAME, ACT_TYPE, ACT_HTTP_METHOD, ACT_TARGET_ENDPOINT, ACT_TARGET_WIDGET, ACT_JSON_SCHEMA, ACT_DISPLAY_ORDER)
VALUES (
    103,
    103,
    'Query Transaction Audit',
    'SEARCH_API',
    'POST',
    '/api/v1/core/history/query',
    'history_grid_1',
    '{"type":"object","properties":{"startDate":{"type":"string"},"endDate":{"type":"string"}},"required":["startDate"]}',
    1
);

MERGE INTO PAGE_ACTION t USING (SELECT 104 AS ACT_ID FROM DUAL) s ON (t.ACT_ID = s.ACT_ID)
WHEN NOT MATCHED THEN INSERT (ACT_ID, SVRD_MENU_ID, ACT_NAME, ACT_TYPE, ACT_HTTP_METHOD, ACT_TARGET_ENDPOINT, ACT_TARGET_WIDGET, ACT_JSON_SCHEMA, ACT_DISPLAY_ORDER)
VALUES (
    104,
    104,
    'Update Card Settings',
    'BUSINESS_API',
    'PUT',
    '/api/v1/core/cards/security',
    'card_spec_card',
    '{"type":"object","properties":{"cardPin":{"type":"string"},"intlUsage":{"type":"string"}},"required":["cardPin"]}',
    1
);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. BUSINESS_LOGIC_CONFIG: Routing Rules
-- ═══════════════════════════════════════════════════════════════════════════════
MERGE INTO BUSINESS_LOGIC_CONFIG t USING (SELECT 1 AS BL_ID FROM DUAL) s ON (t.BL_ID = s.BL_ID)
WHEN NOT MATCHED THEN INSERT (BL_ID, ACT_ID, BL_IDENTIFIER, BL_EXECUTION_PARAMS)
VALUES (1, 101, 'com.sdui.forge.handler.AccountSearchHandler', '{"cacheTtlSeconds":300,"auditRequired":true}');

MERGE INTO BUSINESS_LOGIC_CONFIG t USING (SELECT 2 AS BL_ID FROM DUAL) s ON (t.BL_ID = s.BL_ID)
WHEN NOT MATCHED THEN INSERT (BL_ID, ACT_ID, BL_IDENTIFIER, BL_EXECUTION_PARAMS)
VALUES (2, 102, 'com.sdui.forge.handler.FundTransferHandler', '{"dualApprovalRequired":true,"dailyLimit":50000}');

MERGE INTO BUSINESS_LOGIC_CONFIG t USING (SELECT 3 AS BL_ID FROM DUAL) s ON (t.BL_ID = s.BL_ID)
WHEN NOT MATCHED THEN INSERT (BL_ID, ACT_ID, BL_IDENTIFIER, BL_EXECUTION_PARAMS)
VALUES (3, 103, 'com.sdui.forge.handler.HistoryQueryHandler', '{"maxRows":100}');

MERGE INTO BUSINESS_LOGIC_CONFIG t USING (SELECT 4 AS BL_ID FROM DUAL) s ON (t.BL_ID = s.BL_ID)
WHEN NOT MATCHED THEN INSERT (BL_ID, ACT_ID, BL_IDENTIFIER, BL_EXECUTION_PARAMS)
VALUES (4, 104, 'com.sdui.forge.handler.CardSettingsHandler', '{"hsmVerification":true}');

-- ═══════════════════════════════════════════════════════════════════════════════
-- 7. LOGIN_LOG: Sample Authentication Audit Trail
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO LOGIN_LOG (LLOG_ID, USR_ID, LLOG_IP_ADDRESS, LLOG_USER_AGENT, LLOG_STATUS, LLOG_CREATED_AT)
VALUES (1, 1, '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/128.0', 'SUCCESS', SYSTIMESTAMP - INTERVAL '2' HOUR);

INSERT INTO LOGIN_LOG (LLOG_ID, USR_ID, LLOG_IP_ADDRESS, LLOG_USER_AGENT, LLOG_STATUS, LLOG_CREATED_AT)
VALUES (2, 2, '192.168.1.105', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) Safari/17.5', 'SUCCESS', SYSTIMESTAMP - INTERVAL '1' HOUR);

INSERT INTO LOGIN_LOG (LLOG_ID, USR_ID, LLOG_IP_ADDRESS, LLOG_USER_AGENT, LLOG_STATUS, LLOG_CREATED_AT)
VALUES (3, 3, '10.0.4.15', 'Mozilla/5.0 (X11; Linux x86_64) Firefox/128.0', 'SUCCESS', SYSTIMESTAMP - INTERVAL '15' MINUTE);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 8. ACTIVITY_LOG: Sample Asynchronous Business Activity Audit (CLOB Payloads)
-- ═══════════════════════════════════════════════════════════════════════════════
INSERT INTO ACTIVITY_LOG (ACT_LOG_ID, ACT_LOG_EVENT_ID, ACT_LOG_USER_ID, ACT_LOG_ACTION, ACT_LOG_REFERENCE_KEY, ACT_LOG_PAYLOAD, ACT_LOG_SOURCE_IP, ACT_LOG_CREATED_AT)
VALUES (
    1,
    'evt-seed-001',
    'maker_user',
    'ACCOUNT_SEARCH',
    'ACCT-100293847',
    '{"accountNo":"100293847","branchCode":"BR001"}',
    '10.0.4.10',
    SYSTIMESTAMP - INTERVAL '45' MINUTE
);

INSERT INTO ACTIVITY_LOG (ACT_LOG_ID, ACT_LOG_EVENT_ID, ACT_LOG_USER_ID, ACT_LOG_ACTION, ACT_LOG_REFERENCE_KEY, ACT_LOG_PAYLOAD, ACT_LOG_SOURCE_IP, ACT_LOG_CREATED_AT)
VALUES (
    2,
    'evt-seed-002',
    'maker_user',
    'FUND_TRANSFER',
    'TXN-88392019',
    '{"sourceAccount":"100293847","destAccount":"992837461","amount":12500.00,"currency":"USD"}',
    '10.0.4.10',
    SYSTIMESTAMP - INTERVAL '30' MINUTE
);

COMMIT;
