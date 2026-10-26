"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import useAppStore from "@/store/useAppStore";
import { isTokenExpired } from "@/utils/rbac";

/**
 * DynamicPageLayout — Auth & RBAC Route Guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Requirement: "Unauthenticated access to the Dashboard or internal routes is entirely blocked."
 * Blocks unauthenticated access to /dynamic-page and all nested dynamic templates.
 */
export default function DynamicPageLayout({ children }) {
  const router = useRouter();
  const pathname = usePathname();
  const jwtToken = useAppStore((s) => s.jwtToken);
  const user = useAppStore((s) => s.user);
  const logout = useAppStore((s) => s.logout);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!jwtToken || isTokenExpired(jwtToken)) {
      logout("Please sign in to access internal banking templates.");
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [jwtToken, router, pathname, logout]);

  if (!mounted || !jwtToken || isTokenExpired(jwtToken)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
          <p className="text-xs font-mono">Verifying internal route authorization…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Internal Security Banner */}
      <div className="border-b border-indigo-100 bg-indigo-50/60 px-4 py-2 text-xs text-indigo-900 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span className="font-semibold">Internal Route Secured:</span>
          <span className="font-mono text-indigo-700">{pathname}</span>
        </div>
        <div className="flex items-center gap-2 font-mono text-[11px] text-indigo-600">
          <span>Principal: {user?.username || "Authenticated"}</span>
          <span>·</span>
          <span>Roles: [{user?.roles || "N/A"}]</span>
        </div>
      </div>
      {children}
    </div>
  );
}
