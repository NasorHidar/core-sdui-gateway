"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import useAppStore from "@/store/useAppStore";

/**
 * LoginPage
 * ─────────────────────────────────────────────────────────────────────────────
 * Static login form for the SDUI Forge banking gateway.
 *
 * Flow:
 *   1. User enters username + password.
 *   2. POST to /api/v1/auth/login on the Spring Boot backend.
 *   3. On success → store JWT in Zustand, redirect to /dashboard.
 *   4. On failure → show inline error, remain on page.
 *
 * Since the backend auth controller may not exist yet, we also support a
 * mock login mode that uses the seed data tokens directly.
 */
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "";

// Genuine HMAC-SHA256 JWT tokens matching backend secret & issuer for instant dev login
const MOCK_CREDENTIALS = {
  maker_user: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJtYWtlcl91c2VyIiwiaXNzIjoiY29yZS1zZHVpLWdhdGV3YXkiLCJyb2xlcyI6WyJST0xFX01BS0VSIiwiUk9MRV9BRE1JTiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.0cpKsty18qfJr4vzJ4ZsNUSUx7rR3gLA7DOc1_Rfc9Q",
    roles: "ROLE_MAKER,ROLE_ADMIN",
  },
  checker_user: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJjaGVja2VyX3VzZXIiLCJpc3MiOiJjb3JlLXNkdWktZ2F0ZXdheSIsInJvbGVzIjpbIlJPTEVfQ0hFQ0tFUiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.N7IdrUtuXV4mHhZtlgFANoLB1hM555svmZngswk9uxQ",
    roles: "ROLE_CHECKER",
  },
  admin_user: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbl91c2VyIiwiaXNzIjoiY29yZS1zZHVpLWdhdGV3YXkiLCJyb2xlcyI6WyJST0xFX0FETUlOIiwiUk9MRV9NQUtFUiIsIlJPTEVfQ0hFQ0tFUiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.3th_PEGkEvPL0jgZr6QJWX2OtuoUjP7H3k428Tw2VVk",
    roles: "ROLE_ADMIN,ROLE_MAKER,ROLE_CHECKER",
  },
  auditor_user: {
    token:
      "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhdWRpdG9yX3VzZXIiLCJpc3MiOiJjb3JlLXNkdWktZ2F0ZXdheSIsInJvbGVzIjpbIlJPTEVfQVVESVRPUiJdLCJpYXQiOjE3OTI4NTg3MzgsImV4cCI6MjEwODIxODczOH0.yYRDHkD8o-xiiHis8wFIlJaTMJIR5Wpa2VnwiPbUO84",
    roles: "ROLE_AUDITOR",
  },
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAppStore((s) => s.setAuth);

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

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
        router.replace("/dashboard");
        return;
      }

      if (res.status === 401) throw new Error("Invalid credentials.");
      throw new Error(`Login failed (${res.status})`);
    } catch (fetchErr) {
      // Fallback: mock login using seed-data tokens (dev mode)
      const mock = MOCK_CREDENTIALS[username];
      if (mock && password === "password") {
        setAuth(mock.token, { username, roles: mock.roles });
        router.replace("/dashboard");
        return;
      }
      setError(
        mock
          ? "Invalid password. Use 'password' for dev accounts."
          : fetchErr.message || "Unable to connect to authentication service."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      {/* Glass card */}
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-white/5 p-8 shadow-2xl backdrop-blur-xl">
        {/* Logo + title */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-indigo-600 text-xl font-bold text-white shadow-lg shadow-indigo-500/30">
            SD
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            SDUI Forge Gateway
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Core Banking Server-Driven UI
          </p>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-5 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Username */}
          <div>
            <label htmlFor="login-username" className="mb-1.5 block text-sm font-medium text-slate-300">
              Username
            </label>
            <input
              id="login-username"
              type="text"
              required
              autoComplete="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. maker_user"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Password */}
          <div>
            <label htmlFor="login-password" className="mb-1.5 block text-sm font-medium text-slate-300">
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
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder-slate-500 outline-none transition focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
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
              "Sign In"
            )}
          </button>
        </form>

        {/* Dev hint */}
        <div className="mt-6 rounded-lg border border-white/5 bg-white/5 p-3 text-xs text-slate-500">
          <p className="font-medium text-slate-400">Dev Credentials</p>
          <p className="mt-1">
            <code className="text-indigo-400">maker_user</code> / <code className="text-indigo-400">password</code>
          </p>
          <p>
            <code className="text-indigo-400">admin_user</code> / <code className="text-indigo-400">password</code>
          </p>
        </div>
      </div>
    </div>
  );
}
