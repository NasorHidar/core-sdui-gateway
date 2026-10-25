"use client";

import { create } from "zustand";
import { devtools } from "zustand/middleware";

// ─────────────────────────────────────────────────────────────────────────────
// BACKEND API BASE
// In dev the Next.js proxy (next.config.mjs rewrites) forwards /api → Spring Boot.
// In production, set NEXT_PUBLIC_API_BASE to the gateway URL.
// ─────────────────────────────────────────────────────────────────────────────
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

function getInitialAuth() {
  if (typeof window === "undefined") return { token: null, user: null };
  try {
    const token = window.sessionStorage.getItem("sdui_jwt");
    const userStr = window.sessionStorage.getItem("sdui_user");
    return { token, user: userStr ? JSON.parse(userStr) : null };
  } catch (e) {
    return { token: null, user: null };
  }
}

const initialAuth = getInitialAuth();

/**
 * useAppStore — Global Zustand store for the SDUI Forge frontend.
 *
 * Slices:
 *   AUTH      — jwtToken, user identity
 *   NAV       — mainServices, selectedService, selectedSubService
 *   BLUEPRINT — activeSduiPageId, fetchedBlueprint, loading/error states
 *   SEARCH    — searchContext (the value(s) entered into the SearchPromptBox)
 *
 * Every setter is an action that can be called imperatively from any component.
 * Selectors are kept minimal — components subscribe to individual keys.
 */
const useAppStore = create(
  devtools(
    (set, get) => ({
      // ═══════════════════════════════════════════════════════════════════════
      // AUTH SLICE
      // ═══════════════════════════════════════════════════════════════════════
      jwtToken: initialAuth.token,
      user: initialAuth.user, // { username, roles }

      /** Persist JWT and decoded user info after login. */
      setAuth: (token, user) => {
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.setItem("sdui_jwt", token);
            window.sessionStorage.setItem("sdui_user", JSON.stringify(user));
          } catch (e) {}
        }
        set({ jwtToken: token, user });
      },

      /** Clear auth and reset all navigation state. */
      logout: () => {
        if (typeof window !== "undefined") {
          try {
            window.sessionStorage.removeItem("sdui_jwt");
            window.sessionStorage.removeItem("sdui_user");
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
        });
      },

      // ═══════════════════════════════════════════════════════════════════════
      // NAVIGATION SLICE
      // ═══════════════════════════════════════════════════════════════════════
      mainServices: [],

      /**
       * Fetch the list of main banking services from the backend.
       * Uses GET /api/v1/menus and groups into services (Retail, Cards, Lending).
       */
      fetchMainServices: async () => {
        const { jwtToken } = get();
        try {
          const res = await fetch(`${API_BASE}/api/v1/menus`, {
            headers: { Authorization: `Bearer ${jwtToken}` },
          });
          if (res.status === 401) {
            get().logout();
            return;
          }
          if (!res.ok) throw new Error(`menus fetch failed: ${res.status}`);
          const menuTree = await res.json();

          let services = [];

          // If the backend returns a single root with sub-services (like the default seed),
          // group them into the 3 core banking service categories:
          if (
            Array.isArray(menuTree) &&
            menuTree.length === 1 &&
            Array.isArray(menuTree[0].children) &&
            menuTree[0].children.length > 2
          ) {
            const allItems = menuTree[0].children;
            const retailItems = allItems.filter(
              (item) => [101, 102, 103, 999].includes(item.menuId) || item.pageId === 101 || item.pageId === 102 || item.pageId === 103
            );
            const cardItems = allItems.filter(
              (item) => item.menuId === 104 || item.pageId === 104 || item.menuName?.toLowerCase().includes("card")
            );
            const loanItems = allItems.filter(
              (item) => item.menuId === 105 || item.pageId === 105 || item.menuName?.toLowerCase().includes("lend") || item.menuName?.toLowerCase().includes("loan")
            );

            services = [
              {
                id: 1,
                name: "Retail Core Banking",
                icon: "🏦",
                children: retailItems.length > 0 ? retailItems : allItems,
              },
              {
                id: 2,
                name: "Cards & Electronic Payments",
                icon: "💳",
                children: cardItems,
              },
              {
                id: 3,
                name: "Lending & Credit Facilities",
                icon: "📊",
                children: loanItems,
              },
            ];
          } else if (Array.isArray(menuTree)) {
            // Multiple root services returned
            services = menuTree.map((node, i) => ({
              id: node.menuId || i + 1,
              name: node.menuName,
              pageId: node.pageId,
              allowedRoles: node.allowedRoles,
              children: Array.isArray(node.children) ? node.children : [],
            }));
          }

          set({ mainServices: services });
        } catch (err) {
          console.error("[useAppStore] fetchMainServices error:", err);
          // Fallback: use hardcoded services matching seed data
          set({
            mainServices: [
              {
                id: 1,
                name: "Retail Core Banking",
                icon: "🏦",
                children: [
                  { menuId: 101, menuName: "Customer Dashboard", pageId: 101, searchLabel: "Account Number", searchPlaceholder: "e.g. 100293847" },
                  { menuId: 102, menuName: "Fund Transfer", pageId: 102, searchLabel: "Source Account", searchPlaceholder: "e.g. 100293847" },
                  { menuId: 103, menuName: "Transaction History", pageId: 103, searchLabel: "Reference ID", searchPlaceholder: "e.g. TXN-88392019" },
                  { menuId: 999, menuName: "Fallback Demo", pageId: 999, searchLabel: "Any Value", searchPlaceholder: "test" },
                ],
              },
              {
                id: 2,
                name: "Cards & Electronic Payments",
                icon: "💳",
                children: [
                  { menuId: 104, menuName: "Card Controls", pageId: 104, searchLabel: "Card Number (last 4)", searchPlaceholder: "e.g. 4821" },
                ],
              },
              {
                id: 3,
                name: "Lending & Credit Facilities",
                icon: "📊",
                children: [
                  { menuId: 105, menuName: "Lending Calculator", pageId: 105, searchLabel: "Facility ID", searchPlaceholder: "e.g. FAC-001" },
                ],
              },
            ],
          });
        }
      },

      /** User clicked a main service tile. Populate the sidebar, reset sub-selection. */
      selectedService: null,
      selectService: (service) =>
        set({
          selectedService: service,
          selectedSubService: null,
          activeSduiPageId: null,
          fetchedBlueprint: null,
          searchContext: null,
          blueprintError: null,
        }),

      /** User clicked a sub-service in the sidebar. Show the search prompt. */
      selectedSubService: null,
      selectSubService: (sub) =>
        set({
          selectedSubService: sub,
          activeSduiPageId: null,
          fetchedBlueprint: null,
          searchContext: null,
          blueprintError: null,
        }),

      /** Navigate back to the service grid. */
      goHome: () =>
        set({
          selectedService: null,
          selectedSubService: null,
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
      searchContext: null, // { field: value } from SearchPromptBox

      /**
       * Fetch the SDUI blueprint from the backend.
       * Called when the user submits the search form.
       *
       * @param {number} pageId   — PAGE_TEMPLATE.PAGE_ID
       * @param {object} context  — search values from the prompt box
       */
      fetchBlueprint: async (pageId, context) => {
        const { jwtToken } = get();
        set({ blueprintLoading: true, blueprintError: null, searchContext: context });
        try {
          const res = await fetch(
            `${API_BASE}/api/v1/pages/${pageId}/blueprint`,
            {
              headers: {
                Authorization: `Bearer ${jwtToken}`,
                "Content-Type": "application/json",
              },
            }
          );
          if (res.status === 401) {
            get().logout();
            return;
          }
          if (!res.ok) {
            throw new Error(`Blueprint fetch failed (${res.status})`);
          }
          const data = await res.json();

          // The backend returns PageBlueprintDto which wraps uiBlueprint as a
          // JSON string or parsed object. Normalize to the renderer's shape.
          let blueprint = data.uiBlueprint;
          if (typeof blueprint === "string") {
            blueprint = JSON.parse(blueprint);
          }
          // If the response has a top-level `components` array it's already normalized.
          if (!blueprint && Array.isArray(data.components)) {
            blueprint = data;
          }

          set({
            activeSduiPageId: pageId,
            fetchedBlueprint: blueprint || data,
            blueprintLoading: false,
          });
        } catch (err) {
          console.error("[useAppStore] fetchBlueprint error:", err);

          // Fallback: attempt local mock blueprints
          try {
            const { fetchBlueprint: mockFetch, normalizeBlueprint } = await import("@/lib/mockBlueprint");
            const raw = await mockFetch(pageId);
            const normalized = normalizeBlueprint(raw);
            set({
              activeSduiPageId: pageId,
              fetchedBlueprint: normalized,
              blueprintLoading: false,
            });
          } catch (fallbackErr) {
            set({
              blueprintError: err.message,
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
