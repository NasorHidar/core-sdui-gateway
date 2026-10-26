"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAppStore from "@/store/useAppStore";
import { isTokenExpired } from "@/utils/rbac";

/**
 * Root Page — Mandatory Entry Guard
 * ─────────────────────────────────────────────────────────────────────────────
 * Requirement: "The application begins with a mandatory Login Page."
 * Unauthenticated users are redirected to /login immediately.
 * Authenticated users with active, unexpired JWT tokens proceed to /dashboard.
 */
export default function RootPage() {
  const router = useRouter();
  const jwtToken = useAppStore((s) => s.jwtToken);

  useEffect(() => {
    if (jwtToken && !isTokenExpired(jwtToken)) {
      router.replace("/dashboard");
    } else {
      router.replace("/login");
    }
  }, [jwtToken, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-900 text-slate-400">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
        <p className="text-xs font-mono">Initializing Core Banking Gateway…</p>
      </div>
    </div>
  );
}
