"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";
import {
  parseJwt,
  isTokenExpired,
  getTokenRemainingMs,
  filterServicesByRole,
  filterMenuTreeRecursive,
} from "@/utils/rbac";

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND API BASE
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

let sessionExpiryTimer = null;

function clearSessionCookies() {
  if (typeof document !== "undefined") {
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `sdui_jwt=; path=/; max-age=0; SameSite=Strict${isSecure}`;
    document.cookie = `sdui_user=; path=/; max-age=0; SameSite=Strict${isSecure}`;
  }
}

function setSessionCookies(token, user, maxAgeSeconds) {
  if (typeof document !== "undefined") {
    const age = Math.max(0, Math.floor(maxAgeSeconds));
    const isSecure = typeof window !== "undefined" && window.location.protocol === "https:" ? "; Secure" : "";
    document.cookie = `sdui_jwt=${encodeURIComponent(token)}; path=/; max-age=${age}; SameSite=Strict${isSecure}`;
    document.cookie = `sdui_user=${encodeURIComponent(JSON.stringify(user))}; path=/; max-age=${age}; SameSite=Strict${isSecure}`;
  }
}

function getInitialAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  try {
    const token = window.sessionStorage.getItem("sdui_jwt");
    const userStr = window.sessionStorage.getItem("sdui_user");

    // Strict expiry check on initialization
    if (!token || isTokenExpired(token)) {
      window.sessionStorage.removeItem("sdui_jwt");
      window.sessionStorage.removeItem("sdui_user");
      clearSessionCookies();
      return { token: null, user: null };
    }

    return { token, user: userStr ? JSON.parse(userStr) : null };
  } catch (e) {
    return { token: null, user: null };
  }
}

const initialAuth = getInitialAuth();

/**
 * Fallback search skeletons with validation rules matching backend SERVICE_DETAILS & PAGE_TEMPLATE.
 */
export function getFallbackSearchSkeleton(pageId, menuId = null) {
  const pid = Number(pageId);
  const mid = menuId ? Number(menuId) : pid;

  // Page 103 or 999: Zero fields -> SMART BYPASS
  if (pid === 103 || pid === 999) {
    return {
      pageId: pid,
      title: pid === 103 ? "Transaction History & Audit" : "Fallback & Resilience Demo",
      subtitle: pid === 103 ? "Direct ledger audit using active session credentials." : "Direct execution test of SDUI resilience engine.",
      icon: pid === 103 ? "📋" : "🧪",
      requiresSearch: false,
      submitLabel: pid === 103 ? "Load Ledger" : "Run Test",
      fields: [],
    };
  }

  // Page 101: Customer Dashboard -> MULTIPLE FIELDS (2 fields)
  if (pid === 101) {
    return {
      pageId: 101,
      title: "Customer Account Inquiry",
      subtitle: "Specify account number and optional classification to retrieve profile.",
      icon: "👤",
      requiresSearch: true,
      submitLabel: "Retrieve Account Profile",
      fields: [
        {
          name: "accountNo",
          label: "Account Number",
          inputType: "text",
          required: true,
          placeholder: "e.g. 100293847",
          validation: {
            pattern: "^[0-9]{9,12}$",
            minLength: 9,
            maxLength: 12,
            message: "Account number must be 9 to 12 numeric digits.",
          },
        },
        {
          name: "accountType",
          label: "Account Classification",
          inputType: "select",
          required: false,
          defaultValue: "ALL",
          options: [
            { value: "ALL", label: "All Account Types" },
            { value: "SAVINGS", label: "Savings Account" },
            { value: "CURRENT", label: "Current / Checking" },
            { value: "ESCROW", label: "Escrow Account" },
          ],
        },
      ],
    };
  }

  // Page 102: Fund Transfer
  if (pid === 102) {
    if (mid === 1022) {
      // Instant Wire Transfer -> MULTIPLE FIELDS (2 fields)
      return {
        pageId: 102,
        title: "Instant Wire Transfer (RTGS)",
        subtitle: "Enter originating account and RTGS / SWIFT clearing code.",
        icon: "⚡",
        requiresSearch: true,
        submitLabel: "Authorize Wire Session",
        fields: [
          {
            name: "sourceAccount",
            label: "Originating Account",
            inputType: "text",
            required: true,
            placeholder: "e.g. 1029384756",
            validation: {
              pattern: "^[0-9]{10}$",
              minLength: 10,
              maxLength: 10,
              message: "Originating account must be exactly 10 numeric digits.",
            },
          },
          {
            name: "routingCode",
            label: "SWIFT / Clearing Code",
            inputType: "text",
            required: true,
            placeholder: "e.g. BKTUS33XXX",
            validation: {
              pattern: "^[A-Z0-9]{8,11}$",
              minLength: 8,
              maxLength: 11,
              message: "SWIFT code must be 8-11 uppercase alphanumeric characters.",
            },
          },
        ],
      };
    }

    // Default 102 / 1021 -> SINGLE FIELD (1 field)
    return {
      pageId: 102,
      title: "Internal Transfer Verification",
      subtitle: "Enter the source debit account to verify balance and routing.",
      icon: "💸",
      requiresSearch: true,
      submitLabel: "Verify Source Account",
      fields: [
        {
          name: "sourceAccount",
          label: "Source Account Number",
          inputType: "text",
          required: true,
          placeholder: "e.g. 1029384756",
          validation: {
            pattern: "^[0-9]{10}$",
            minLength: 10,
            maxLength: 10,
            message: "Source account must be exactly 10 digits.",
          },
        },
      ],
    };
  }

  // Page 104: Cards & Electronic Payments
  if (pid === 104) {
    if (mid === 1042) {
      // Global POS & ATM Limits -> MULTIPLE FIELDS (2 fields)
      return {
        pageId: 104,
        title: "Global Card Limit Management",
        subtitle: "Specify last 4 digits of card and transaction channel.",
        icon: "🌐",
        requiresSearch: true,
        submitLabel: "Query Limit Profiles",
        fields: [
          {
            name: "cardLast4",
            label: "Card Last 4 Digits",
            inputType: "text",
            required: true,
            placeholder: "e.g. 4821",
            validation: {
              pattern: "^[0-9]{4}$",
              minLength: 4,
              maxLength: 4,
              message: "Must be exactly 4 numeric digits.",
            },
          },
          {
            name: "channel",
            label: "Channel Scope",
            inputType: "select",
            required: true,
            defaultValue: "ATM",
            options: [
              { value: "ATM", label: "ATM Withdrawals" },
              { value: "POS", label: "Point of Sale (POS)" },
              { value: "ECOMM", label: "E-Commerce / Online" },
            ],
          },
        ],
      };
    }

    return {
      pageId: 104,
      title: "Card Controls & Security",
      subtitle: "Enter last 4 digits of debit or credit card.",
      icon: "💳",
      requiresSearch: true,
      submitLabel: "Query Card Details",
      fields: [
        {
          name: "cardLast4",
          label: "Card Last 4 Digits",
          inputType: "text",
          required: true,
          placeholder: "e.g. 4821",
          validation: {
            pattern: "^[0-9]{4}$",
            minLength: 4,
            maxLength: 4,
            message: "Must be exactly 4 numeric digits.",
          },
        },
      ],
    };
  }

  // Page 105: Commercial Lending
  if (pid === 105) {
    return {
      pageId: 105,
      title: "Commercial Lending Inquiry",
      subtitle: "Enter Credit Facility ID and amortization term to load calculation.",
      icon: "📊",
      requiresSearch: true,
      submitLabel: "Calculate Facility",
      fields: [
        {
          name: "facilityId",
          label: "Credit Facility ID",
          inputType: "text",
          required: true,
          placeholder: "e.g. FAC-001",
          validation: {
            pattern: "^FAC-[0-9]{3,6}$",
            message: "Facility ID must match format FAC-XXX (e.g. FAC-001).",
          },
        },
        {
          name: "termMonths",
          label: "Term (Months)",
          inputType: "number",
          required: true,
          defaultValue: "36",
          placeholder: "e.g. 36",
          validation: {
            min: 6,
            max: 120,
            message: "Term must be between 6 and 120 months.",
          },
        },
      ],
    };
  }

  return {
    pageId: pid,
    title: "Service Inquiry",
    subtitle: "Enter search value to load banking details.",
    icon: "🔍",
    requiresSearch: true,
    submitLabel: "Search",
    fields: [
      {
        name: "searchValue",
        label: "Search Value",
        inputType: "text",
        required: true,
        placeholder: "Enter value…",
      },
    ],
  };
}

/**
 * useAppStore — Global Zustand store for the SDUI Forge frontend.
 *
 * Implements:
 *   1. Secure Session Management & Strict Token Expiry
 *   2. Role-Based Access Control (RBAC) mapping to SVRD_ALLOWED_ROLES
 *   3. 100% Dynamic SDUI State & Service Tree
 *   4. Skeleton-Driven Search Interface, Smart Bypass & Dynamic Validation
 */
const useAppStore = create(
  devtools(
    (set, get) => ({
      // ═══════════════════════════════════════════════════════════════════════
      // AUTH & SESSION SLICE
      // ═══════════════════════════════════════════════════════════════════════
      jwtToken: initialAuth.token,
      user: initialAuth.user, // { username, roles }
      sessionExpiredMessage: null,

      /**
       * Persist JWT and decoded user info after login with strict expiry tracking.
       */
      setAuth: (token, user) => {
        if (!token || isTokenExpired(token)) {
          get().logout("Provided authentication token is already expired.");
          return;
        }

        // Extract payload for verified roles and expiry
        const payload = parseJwt(token);
        const roles =
          user?.roles ||
          (Array.isArray(payload?.roles) ? payload.roles.join(",") : payload?.roles) ||
          "";

        const verifiedUser = {
          username: user?.username || payload?.sub || "User",
          roles,
        };

        const remainingMs = getTokenRemainingMs(token);

        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem("sdui_jwt", token);
            window.sessionStorage.setItem("sdui_user", JSON.stringify(verifiedUser));
            setSessionCookies(token, verifiedUser, remainingMs / 1000);
          } catch (e) {
            console.error("[useAppStore] Failed to write session storage:", e);
          }
        }

        // Schedule auto-logout at exact expiration moment
        if (sessionExpiryTimer) {
          clearTimeout(sessionExpiryTimer);
        }
        sessionExpiryTimer = setTimeout(() => {
          console.warn("[useAppStore] Session expired at deadline.");
          get().logout("Your session has expired. Please sign in again.");
        }, remainingMs);

        set({
          jwtToken: token,
          user: verifiedUser,
          sessionExpiredMessage: null,
        });
      },

      /**
       * Clear auth, cookies, reset navigation state, and set optional expiry notice.
       */
      logout: (reason = null) => {
        if (sessionExpiryTimer) {
          clearTimeout(sessionExpiryTimer);
          sessionExpiryTimer = null;
        }

        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.removeItem("sdui_jwt");
            window.sessionStorage.removeItem("sdui_user");
            clearSessionCookies();
          } catch (e) {}
        }

        set({
          jwtToken: null,
          user: null,
          mainServices: [],
          selectedService: null,
          selectedSubService: null,
          activeSduiPageId: null,
          fetchedBlueprint: null,
          searchContext: null,
          blueprintLoading: false,
          blueprintError: null,
          subServicesLoading: false,
          subServicesError: null,
          searchSkeleton: null,
          searchSkeletonLoading: false,
          searchSkeletonError: null,
          sessionExpiredMessage: reason,
        });
      },

      // ═══════════════════════════════════════════════════════════════════════
      // NAVIGATION & RBAC SLICE
      // ═══════════════════════════════════════════════════════════════════════
      mainServices: [],

      /**
       * Fetch the list of main banking services from the backend.
       * Evaluates user's assigned roles against SVRD_ALLOWED_ROLES to strictly
       * filter visible services and sub-services.
       */
      fetchMainServices: async () => {
        const { jwtToken, user } = get();

        // If unauthenticated or token expired, trigger logout
        if (!jwtToken || isTokenExpired(jwtToken)) {
          get().logout("Your session has expired. Please log in again.");
          return;
        }

        const userRoles = user?.roles || [];

        try {
          // 1. Fetch primary services directly from the database (SERVICE table)
          let rawServices = [];
          const res = await fetch(`${API_BASE}/api/v1/services`, {
            headers: { Authorization: `Bearer ${jwtToken}` },
          });

          if (res.status === 401) {
            get().logout("Session expired or invalid credentials.");
            return;
          }

          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              rawServices = data.map((s) => ({
                id: s.id,
                name: s.name,
                iconUrl: s.iconUrl,
                icon: s.iconUrl?.includes("cards") ? "💳" : s.iconUrl?.includes("lending") ? "📊" : "🏦",
                baseApiUrl: s.baseApiUrl,
                isActive: s.isActive ?? 1,
                sortOrder: s.sortOrder ?? 1,
                children: Array.isArray(s.children) ? s.children : [],
              }));
            }
          }

          // Fallback to /api/v1/menus if /api/v1/services returns empty
          if (rawServices.length === 0) {
            const menuRes = await fetch(`${API_BASE}/api/v1/menus`, {
              headers: { Authorization: `Bearer ${jwtToken}` },
            });
            if (menuRes.ok) {
              const menuTree = await menuRes.json();
              if (
                Array.isArray(menuTree) &&
                menuTree.length === 1 &&
                Array.isArray(menuTree[0].children)
              ) {
                const allItems = menuTree[0].children;
                const retailItems = allItems.filter(
                  (item) =>
                    [101, 102, 103, 999].includes(item.menuId) ||
                    item.pageId === 101 ||
                    item.pageId === 102 ||
                    item.pageId === 103
                );
                const cardItems = allItems.filter(
                  (item) =>
                    item.menuId === 104 ||
                    item.pageId === 104 ||
                    item.menuName?.toLowerCase().includes("card")
                );
                const loanItems = allItems.filter(
                  (item) =>
                    item.menuId === 105 ||
                    item.pageId === 105 ||
                    item.menuName?.toLowerCase().includes("lend") ||
                    item.menuName?.toLowerCase().includes("loan")
                );

                rawServices = [
                  {
                    id: 1,
                    name: "Retail Core Banking",
                    icon: "🏦",
                    iconUrl: "/icons/retail.svg",
                    isActive: 1,
                    sortOrder: 1,
                    children: retailItems,
                  },
                  {
                    id: 2,
                    name: "Cards & Electronic Payments",
                    icon: "💳",
                    iconUrl: "/icons/cards.svg",
                    isActive: 1,
                    sortOrder: 2,
                    children: cardItems,
                  },
                  {
                    id: 3,
                    name: "Lending & Credit Facilities",
                    icon: "📊",
                    iconUrl: "/icons/lending.svg",
                    isActive: 1,
                    sortOrder: 3,
                    children: loanItems,
                  },
                ];
              }
            }
          }

          // Filter by active status (isActive === 1) and sort by sortOrder ascending
          const activeOrderedServices = rawServices
            .filter((s) => (s.isActive ?? 1) === 1)
            .sort((a, b) => (a.sortOrder ?? 1) - (b.sortOrder ?? 1));

          // Apply RBAC filtering against SVRD_ALLOWED_ROLES
          const authorizedServices = filterServicesByRole(activeOrderedServices, userRoles);
          set({ mainServices: authorizedServices });
        } catch (err) {
          console.warn("[useAppStore] fetchMainServices error, using RBAC fallback:", err.message);

          // Canonical seed-data matching SVRD_ALLOWED_ROLES from oracle-init/02_rich_seed_data.sql
          const fallbackSeedServices = [
            {
              id: 1,
              name: "Retail Core Banking",
              icon: "🏦",
              allowedRoles: "ADMIN,MAKER,CHECKER,AUDITOR",
              children: [
                {
                  menuId: 101,
                  menuName: "Customer Dashboard",
                  pageId: 101,
                  allowedRoles: "ADMIN,MAKER,CHECKER,AUDITOR",
                  searchLabel: "Account Number",
                  searchPlaceholder: "e.g. 100293847",
                },
                {
                  menuId: 102,
                  menuName: "Fund Transfer",
                  pageId: 102,
                  allowedRoles: "ADMIN,MAKER",
                  searchLabel: "Source Account",
                  searchPlaceholder: "e.g. 100293847",
                },
                {
                  menuId: 103,
                  menuName: "Transaction History",
                  pageId: 103,
                  allowedRoles: "ADMIN,MAKER,CHECKER,AUDITOR",
                  searchLabel: "Reference ID",
                  searchPlaceholder: "e.g. TXN-88392019",
                },
                {
                  menuId: 999,
                  menuName: "Fallback Demo",
                  pageId: 999,
                  allowedRoles: "ADMIN,MAKER,CHECKER",
                  searchLabel: "Any Value",
                  searchPlaceholder: "test",
                },
              ],
            },
            {
              id: 2,
              name: "Cards & Electronic Payments",
              icon: "💳",
              allowedRoles: "ADMIN,MAKER,CHECKER",
              children: [
                {
                  menuId: 104,
                  menuName: "Card Controls",
                  pageId: 104,
                  allowedRoles: "ADMIN,MAKER,CHECKER",
                  searchLabel: "Card Number (last 4)",
                  searchPlaceholder: "e.g. 4821",
                },
              ],
            },
            {
              id: 3,
              name: "Lending & Credit Facilities",
              icon: "📊",
              allowedRoles: "ADMIN,MAKER",
              children: [
                {
                  menuId: 105,
                  menuName: "Lending Calculator",
                  pageId: 105,
                  allowedRoles: "ADMIN,MAKER",
                  searchLabel: "Facility ID",
                  searchPlaceholder: "e.g. FAC-001",
                },
              ],
            },
          ];

          // Strictly filter by assigned user roles
          const authorizedFallback = filterServicesByRole(fallbackSeedServices, userRoles);
          set({ mainServices: authorizedFallback });
        }
      },

      selectedService: null,
      subServicesLoading: false,
      subServicesError: null,

      /**
       * Selecting a primary service triggers an asynchronous fetch for its
       * associated sub-services from the backend (/api/v1/services/{serviceId}/sub-services),
       * rendered as a Left Sidebar Menu supporting multi-level nested hierarchies.
       */
      selectService: async (service) => {
        if (!service) {
          get().goHome();
          return;
        }

        // 1. Immediately switch active service and initialize loading state
        set({
          selectedService: {
            ...service,
            children: service.children || [],
          },
          selectedSubService: null,
          activeSduiPageId: null,
          fetchedBlueprint: null,
          searchContext: null,
          blueprintError: null,
          subServicesLoading: true,
          subServicesError: null,
        });

        // 2. Fetch hierarchical sub-services
        await get().fetchSubServicesForService(service.id, service);
      },

      /**
       * Asynchronously fetches and parses the nested hierarchical sub-service tree
       * for a given service ID, evaluating RBAC recursively.
       */
      fetchSubServicesForService: async (serviceId, fallbackService = null) => {
        const { jwtToken, user, selectedService } = get();

        if (!jwtToken || isTokenExpired(jwtToken)) {
          get().logout("Your session has expired. Please log in again.");
          return;
        }

        set({ subServicesLoading: true, subServicesError: null });

        try {
          const res = await fetch(`${API_BASE}/api/v1/services/${serviceId}/sub-services`, {
            headers: {
              Authorization: `Bearer ${jwtToken}`,
              "Content-Type": "application/json",
            },
          });

          if (res.status === 401) {
            get().logout("Session expired or invalid credentials.");
            return;
          }

          if (!res.ok) {
            throw new Error(`Sub-services fetch failed: HTTP ${res.status}`);
          }

          const rawNodes = await res.json();
          // Filter recursively by user roles to strictly enforce SVRD_ALLOWED_ROLES at all depths
          const authorizedTree = filterMenuTreeRecursive(rawNodes, user?.roles);

          set((state) => ({
            selectedService: state.selectedService
              ? {
                  ...state.selectedService,
                  children: authorizedTree,
                }
              : null,
            subServicesLoading: false,
            subServicesError: null,
          }));
        } catch (err) {
          console.warn(`[useAppStore] fetchSubServices error for service ${serviceId}:`, err.message);

          // Fallback: use existing service children filtered with RBAC
          const current = fallbackService || selectedService;
          const fallbackTree = filterMenuTreeRecursive(
            current?.children || [],
            user?.roles
          );

          set((state) => ({
            selectedService: state.selectedService
              ? {
                  ...state.selectedService,
                  children: fallbackTree,
                }
              : null,
            subServicesLoading: false,
            subServicesError: err.message,
          }));
        }
      },

      // ═══════════════════════════════════════════════════════════════════════
      // SKELETON-DRIVEN SEARCH & SMART BYPASS SLICE
      // ═══════════════════════════════════════════════════════════════════════
      selectedSubService: null,
      searchSkeleton: null,
      searchSkeletonLoading: false,
      searchSkeletonError: null,

      /**
       * Fetches dynamic Search UI Skeleton with validation rules from the backend.
       */
      fetchSearchSkeleton: async (pageId, menuId = null) => {
        const { jwtToken } = get();
        set({ searchSkeletonLoading: true, searchSkeletonError: null });

        try {
          const url = `${API_BASE}/api/v1/pages/${pageId}/search-skeleton${menuId ? `?menuId=${menuId}` : ""}`;
          const res = await fetch(url, {
            headers: jwtToken ? { Authorization: `Bearer ${jwtToken}` } : {},
          });

          if (res.ok) {
            const data = await res.json();
            set({ searchSkeleton: data, searchSkeletonLoading: false });
            return data;
          }
          throw new Error(`HTTP ${res.status}`);
        } catch (err) {
          console.warn(`[useAppStore] fetchSearchSkeleton failed for page ${pageId}, using fallback:`, err.message);
          const fallback = getFallbackSearchSkeleton(pageId, menuId);
          set({ searchSkeleton: fallback, searchSkeletonLoading: false });
          return fallback;
        }
      },

      /**
       * Selecting a menu item dynamically generates a Search Box Component
       * based on a predefined UI 'skeleton' configuration.
       *
       * Smart Bypass: If a sub-service requires no search parameters (0 fields),
       * the frontend automatically skips the search UI and dispatches a direct
       * request to the backend.
       */
      selectSubService: async (sub) => {
        if (!sub) return;

        const pageId = sub.pageId || sub.menuId;

        // Reset previous state
        set({
          selectedSubService: sub,
          searchSkeleton: sub.searchSkeleton || null,
          searchSkeletonLoading: !sub.searchSkeleton,
          searchSkeletonError: null,
          activeSduiPageId: null,
          fetchedBlueprint: null,
          searchContext: null,
          blueprintError: null,
        });

        let skeleton = sub.searchSkeleton;
        if (!skeleton && pageId) {
          skeleton = await get().fetchSearchSkeleton(pageId, sub.menuId);
        }

        // SMART BYPASS: If no search parameters are needed, skip search UI immediately
        const requiresSearch =
          skeleton?.requiresSearch !== false &&
          Array.isArray(skeleton?.fields) &&
          skeleton.fields.length > 0;

        if (!requiresSearch) {
          console.log(
            `[Smart Bypass] Sub-service '${sub.menuName}' (Page #${pageId}) requires 0 search parameters. Skipping Search UI and dispatching direct backend request.`
          );
          await get().fetchBlueprint(pageId, {
            bypass: true,
            directLoad: true,
            subServiceName: sub.menuName,
          });
        }
      },

      /** Navigate back to the service grid. */
      goHome: () =>
        set({
          selectedService: null,
          selectedSubService: null,
          searchSkeleton: null,
          searchSkeletonLoading: false,
          searchSkeletonError: null,
          activeSduiPageId: null,
          fetchedBlueprint: null,
          searchContext: null,
          blueprintError: null,
        }),

      // ═══════════════════════════════════════════════════════════════════════
      // BLUEPRINT / SDUI SLICE
      // ═══════════════════════════════════════════════════════════════════════
      activeSduiPageId: null,
      fetchedBlueprint: null,
      blueprintLoading: false,
      blueprintError: null,
      searchContext: null,

      clearBlueprintError: () => set({ blueprintError: null, blueprintLoading: false }),

      fetchBlueprint: async (pageId, context, options = {}) => {
        const { jwtToken } = get();

        if (!jwtToken || isTokenExpired(jwtToken)) {
          get().logout("Your session has expired. Please log in again.");
          return;
        }

        set({
          blueprintLoading: true,
          blueprintError: null,
          searchContext: context,
          activeSduiPageId: pageId,
        });

        // 8-Second Gateway Timeout Signal (Protection against microservice freezes)
        const timeoutMs = options.timeoutMs || 8000;
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => {
          abortController.abort(new Error("API_TIMEOUT"));
        }, timeoutMs);

        try {
          // Simulation hooks for automated testing & resilience verification
          if (options.simulateTimeout) {
            await new Promise((r) => setTimeout(r, 600));
            throw new Error("API_TIMEOUT");
          }
          if (options.simulateDown) {
            await new Promise((r) => setTimeout(r, 400));
            const err = new Error("Gateway 503: Core Banking Microservice Unavailable");
            err.status = 503;
            throw err;
          }

          const res = await fetch(
            `${API_BASE}/api/v1/pages/${pageId}/blueprint`,
            {
              headers: {
                Authorization: `Bearer ${jwtToken}`,
                "Content-Type": "application/json",
              },
              signal: abortController.signal,
            }
          );
          clearTimeout(timeoutId);

          if (res.status === 401) {
            get().logout("Your session has expired. Please log in again.");
            return;
          }
          if (!res.ok) {
            const err = new Error(`Gateway returned HTTP ${res.status}`);
            err.status = res.status;
            throw err;
          }
          const data = await res.json();

          let blueprint = data.uiBlueprint;
          if (typeof blueprint === "string") {
            blueprint = JSON.parse(blueprint);
          }
          if (!blueprint && Array.isArray(data.components)) {
            blueprint = data;
          }

          // Merge backend PAGE_ACTION list and metadata into blueprint
          if (blueprint && typeof blueprint === "object") {
            blueprint.actions = (Array.isArray(data.actions) && data.actions.length > 0)
              ? data.actions
              : (blueprint.actions || []);
            blueprint.pageId = data.pageId || pageId;
            blueprint.pageTitle = blueprint.pageTitle || data.pageTitle;
            blueprint.layoutType = blueprint.layoutType || data.layoutType;
          }

          set({
            activeSduiPageId: pageId,
            fetchedBlueprint: blueprint || data,
            blueprintLoading: false,
            blueprintError: null,
          });
        } catch (err) {
          clearTimeout(timeoutId);
          console.error("[useAppStore] fetchBlueprint failure:", err);

          const isTimeout =
            err.name === "AbortError" ||
            err.message === "API_TIMEOUT" ||
            err.message?.toLowerCase().includes("timeout");

          const statusCode = err.status || (isTimeout ? 504 : 503);
          const errorType = isTimeout
            ? "TIMEOUT"
            : statusCode === 404
            ? "NOT_FOUND"
            : "MICROSERVICE_UNAVAILABLE";

          const structuredError = {
            type: errorType,
            status: statusCode,
            pageId,
            message: isTimeout
              ? `Gateway Request Timed Out (${timeoutMs / 1000}s). The Core Banking SDUI Gateway did not return a response in time.`
              : statusCode === 404
              ? `Page UI Blueprint #${pageId} was not found on the Core Banking Gateway.`
              : `Core Banking Service Unavailable (HTTP ${statusCode}): ${err.message || "Microservice connection failure."}`,
            details: err.message,
            timestamp: new Date().toISOString(),
          };

          // If forced error or timeout, skip secondary mock and trigger elegant Fallback Component immediately
          if (options.simulateTimeout || options.simulateDown || options.forceError) {
            set({
              fetchedBlueprint: null,
              blueprintError: structuredError,
              blueprintLoading: false,
            });
            return;
          }

          // Secondary Fallback: attempt offline/cached local JSON blueprint if available
          try {
            const { fetchBlueprint: mockFetch, normalizeBlueprint } = await import("@/lib/mockBlueprint");
            const raw = await mockFetch(pageId);
            const normalized = normalizeBlueprint(raw);
            set({
              activeSduiPageId: pageId,
              fetchedBlueprint: normalized,
              blueprintLoading: false,
              blueprintError: null,
            });
          } catch (fallbackErr) {
            // Both primary gateway and secondary mock failed:
            // Render predefined Error/Fallback Component instead of a blank screen
            set({
              fetchedBlueprint: null,
              blueprintError: structuredError,
              blueprintLoading: false,
            });
          }
        }
      },
    }),
    { name: "sdui-app-store" }
  )
);

export default useAppStore;
