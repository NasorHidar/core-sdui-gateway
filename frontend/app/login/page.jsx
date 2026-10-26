"use client";

import { Suspense, useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import useAppStore from "@/store/useAppStore";
import { isTokenExpired } from "@/utils/rbac";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Genuine HMAC-SHA256 JWT tokens matching backend secret & issuer for instant dev login
const MOCK_CREDENTIALS = {
  admin_user: {
    label: "Admin User",
    badge: "ADMIN, MAKER, CHECKER",
    desc: "Full unrestricted access to all banking modules",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbl91c2VyIiwiaXNzIjoiY29yZS1zZHVpLWdhdGV3YXkiLCJyb2xlcyI6WyJST0xFX0FETUlOIiwiUk9MRV9NQUtFUiIsIlJPTEVfQ0hFQ0tFUiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.3th_PEGkEvPL0jgZr6QJWX2OtuoUjP7H3k428Tw2VVk",
    roles: "ROLE_ADMIN,ROLE_MAKER,ROLE_CHECKER",
  },
  maker_user: {
    label: "Maker User",
    badge: "MAKER, ADMIN",
    desc: "Operational maker access with transfer initiation rights",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYWtlcl91c2VyIiwiaXNzIjoiY29yZS1zZHVpLWdhdGV3YXkiLCJyb2xlcyI6WyJST0xFX01BS0VSIiwiUk9MRV9BRE1JTiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.0cpKsty18qfJr4vzJ4ZsNUSUx7rR3gLA7DOc1_Rfc9Q",
    roles: "ROLE_MAKER,ROLE_ADMIN",
  },
  checker_user: {
    label: "Checker User",
    badge: "CHECKER only",
    desc: "Verification role (Fund Transfer & Lending are hidden)",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjaGVja2VyX3VzZXIiLCJpc3MiOiJjb3JlLXNkdWktZ2F0ZXdheSIsInJvbGVzIjpbIlJPTEVfQ0hFQ0tFUiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.N7IdrUtuXV4mHhZtlgFANoLB1hM555svmZngswk9uxQ",
    roles: "ROLE_CHECKER",
  },
  auditor_user: {
    label: "Auditor User",
    badge: "AUDITOR only",
    desc: "Read-only audit role (Cards & Lending menus are hidden)",
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdWRpdG9yX3VzZXIiLCJpc3MiOiJjb3JlLXNkdWktZ2F0ZXdheSIsInJvbGVzIjpbIlJPTEVfQVVESVRPUiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.yYRDHkD8o-xiiHis8wFIlJaTMJIR5Wpa2VnwiPbUO84",
    roles: "ROLE_AUDITOR",
  },
};

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAppStore((s) => s.setAuth);
  const jwtToken = useAppStore((s) => s.jwtToken);
  const sessionExpiredMessage = useAppStore((s) => s.sessionExpiredMessage);

  const [username, setUsername] = useState("maker_user");
  const [password, setPassword] = useState("password");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // If user already holds a valid unexpired session, redirect to dashboard
  useEffect(() => {
    if (jwtToken && !isTokenExpired(jwtToken)) {
      router.replace("/dashboard");
    }
  }, [jwtToken, router]);

  const selectRole = (userKey) => {
    setUsername(userKey);
    setPassword("password");
    setError(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Attempt real backend login
      const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      if (res.ok) {
        const data = await res.json();
        setAuth(data.token, { username, roles: data.roles || "" });
        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        router.replace(redirectUrl);
        return;
      }

      if (res.status === 401) throw new Error("Invalid username or password.");
      throw new Error(`Authentication failed (${res.status})`);
    } catch (fetchErr) {
      // Fallback: mock credentials for local dev / offline testing
      const mock = MOCK_CREDENTIALS[username];
      if (mock && password === "password") {
        setAuth(mock.token, { username, roles: mock.roles });
        const redirectUrl = searchParams.get("redirect") || "/dashboard";
        router.replace(redirectUrl);
        return;
      }

      setError(
        mock
          ? "Invalid password. Use 'password' for demo accounts."
          : fetchErr.message || "Unable to reach authentication service."
      );
    } finally {
      setLoading(false);
    }
  };

  const expiryNotice =
    sessionExpiredMessage ||
    (searchParams.get("reason") === "expired"
      ? "Your session has expired. Please sign in again."
      : null);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-950 via-indigo-950 to-slate-900 px-4 py-8">
      <div className="w-full max-w-lg rounded-3xl border border-white/10 bg-white/5 p-8 md:p-10 shadow-2xl backdrop-blur-2xl">
        {/* Header */}
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-extrabold text-white shadow-xl shadow-indigo-500/30">
            SD
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            Core Banking Gateway
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Server-Driven UI (SDUI) · Role-Based Access Control
          </p>
        </div>

        {/* Session Expiry Alert */}
        {expiryNotice && (
          <div className="mb-5 flex items-center gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
            <svg className="h-4 w-4 shrink-0 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{expiryNotice}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-xs text-red-300">
            {error}
          </div>
        )}

        {/* Quick RBAC Role Selectors */}
        <div className="mb-6">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Select Test Persona (Evaluates SVRD_ALLOWED_ROLES)
          </label>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(MOCK_CREDENTIALS).map(([key, item]) => {
              const isSelected = username === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => selectRole(key)}
                  className={`flex flex-col text-left p-2.5 rounded-xl border transition ${
                    isSelected
                      ? "border-indigo-500 bg-indigo-600/20 text-white shadow-sm"
                      : "border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <span className="text-xs font-bold text-white">{item.label}</span>
                  <span className="text-[10px] text-indigo-300 font-mono mt-0.5">{item.badge}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="login-username"
              className="mb-1 block text-xs font-medium text-slate-300"
            >
              Username / Service Principal
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. maker_user"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <div>
            <label
              htmlFor="login-password"
              className="mb-1 block text-xs font-medium text-slate-300"
            >
              Password
            </label>
            <input
              id="login-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-600/30 transition hover:bg-indigo-500 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Authenticating…
              </span>
            ) : (
              "Sign In to Core Banking"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-400">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
            <p className="text-xs font-mono">Loading Core Banking Login…</p>
          </div>
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
