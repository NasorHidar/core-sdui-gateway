"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import useAppStore from "@/store/useAppStore";
import LeftSidebar from "@/components/LeftSidebar";
import AuditLogModal from "@/components/AuditLogModal";
import { isTokenExpired } from "@/utils/rbac";

/**
 * DashboardLayout
 * ─────────────────────────────────────────────────────────────────────────────
 * Wraps all /dashboard/* routes with:
 *   - JWT auth guard (redirect to /login if unauthenticated)
 *   - Top header bar with branding + user info + logout + live audit trail
 *   - Responsive left sidebar (collapses when no service is selected)
 *   - Scrollable main content area
 */
export default function DashboardLayout({ children }) {
  const router = useRouter();
  const [showAuditModal, setShowAuditModal] = useState(false);
  const jwtToken = useAppStore((s) => s.jwtToken);
  const user = useAppStore((s) => s.user);
  const selectedService = useAppStore((s) => s.selectedService);
  const logout = useAppStore((s) => s.logout);
  const goHome = useAppStore((s) => s.goHome);
  const fetchMainServices = useAppStore((s) => s.fetchMainServices);

  // Auth guard: redirect to login if no JWT or token has expired
  useEffect(() => {
    if (!jwtToken || isTokenExpired(jwtToken)) {
      logout(jwtToken ? "Your session has expired. Please sign in again." : null);
      router.replace("/login");
    }
  }, [jwtToken, router, logout]);

  // Fetch services on mount (after auth is confirmed)
  useEffect(() => {
    if (jwtToken && !isTokenExpired(jwtToken)) {
      fetchMainServices();
    }
  }, [jwtToken, fetchMainServices]);

  // Don't render chrome until auth is confirmed
  if (!jwtToken || isTokenExpired(jwtToken)) return null;

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      {/* ── Top Header Bar ───────────────────────────────────────────────── */}
      <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-200 bg-white px-5 shadow-sm">
        <button
          onClick={goHome}
          className="flex items-center gap-2.5 transition hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-600 text-xs font-bold text-white shadow">
            SD
          </span>
          <div className="text-left">
            <span className="block text-sm font-bold leading-tight text-slate-900">
              SDUI Forge
            </span>
            <span className="block text-[10px] leading-tight text-slate-500">
              Core Banking Gateway
            </span>
          </div>
        </button>

        <div className="flex items-center gap-3">
          {/* Live Audit Trail / ACTIVITY_LOG Modal Trigger */}
          <button
            type="button"
            onClick={() => setShowAuditModal(true)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/70 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 active:scale-95 shadow-2xs"
          >
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>Audit Trail (ACTIVITY_LOG)</span>
          </button>

          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
            {user?.username || "User"} · {user?.roles || "N/A"}
          </span>
          <button
            onClick={handleLogout}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-red-50 hover:border-red-200 hover:text-red-600"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* ── Live Audit Log Modal ────────────────────────────────────────── */}
      <AuditLogModal
        isOpen={showAuditModal}
        onClose={() => setShowAuditModal(false)}
      />

      {/* ── Body: Sidebar + Main Content ─────────────────────────────────── */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar — only rendered when a service is selected */}
        {selectedService && (
          <aside className="w-64 shrink-0 overflow-y-auto border-r border-slate-200 bg-white">
            <LeftSidebar />
          </aside>
        )}

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
