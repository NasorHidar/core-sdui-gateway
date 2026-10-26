/**
 * Dynamic Page (Next.js 14 App Router — Server Component)
 * ────────────────────────────────────────────────────────────────────
 * Route: /dynamic-page/[pageId]
 *
 * Implements strict RBAC enforcement (SVRD_ALLOWED_ROLES) and session validation.
 * Unauthenticated access is redirected to /login.
 * Unauthorized roles receive an explicit 403 Forbidden Access Denied card.
 */

import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import SduiRenderer from "@/components/SduiRenderer";
import SduiDynamicEngine from "@/components/SduiDynamicEngine";
import JsonBlueprintInspector from "@/components/JsonBlueprintInspector";
import { PageErrorBoundary } from "@/components/ErrorBoundary";
import {
  loadBlueprintFromJson,
  listAvailableBlueprints,
} from "@/lib/jsonBlueprintLoader";
import { normalizeBlueprint } from "@/lib/mockBlueprint";
import { parseJwt, isRoleAuthorized, isTokenExpired } from "@/utils/rbac";

export default async function DynamicPage({ params }) {
  const pageId = params?.pageId;

  // 1. Mandatory Session Validation (Server Component)
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("sdui_jwt")?.value;

  if (!tokenCookie || isTokenExpired(tokenCookie)) {
    redirect(`/login?redirect=${encodeURIComponent(`/dynamic-page/${pageId}`)}&reason=expired`);
  }

  const payload = parseJwt(tokenCookie);
  const userRoles = payload?.roles || [];
  const username = payload?.sub || "User";

  let blueprint = null;
  let meta = null;
  let availableBlueprints = [];
  let errorDetails = null;

  try {
    const all = await listAvailableBlueprints();
    // Filter available blueprints switcher to only authorized ones
    availableBlueprints = all.filter((item) =>
      isRoleAuthorized(userRoles, item.allowedRoles)
    );

    const result = await loadBlueprintFromJson(pageId);
    blueprint = normalizeBlueprint(result.blueprint);
    meta = result.meta;
  } catch (err) {
    errorDetails = {
      message: err?.message || "Failed to load blueprint JSON file.",
      status: err?.status || 500,
      availableBlueprints: err?.availableBlueprints || availableBlueprints,
    };
  }

  // 2. Strict Role-Based Access Control Evaluation (SVRD_ALLOWED_ROLES)
  const isAuthorized =
    !blueprint || isRoleAuthorized(userRoles, blueprint.allowedRoles);

  // Check if blueprint uses 100% dynamic widgets format
  const hasDynamicWidgets =
    (Array.isArray(blueprint?.widgets) && blueprint.widgets.length > 0) ||
    blueprint?.components?.some((c) => {
      const t = (c?.type || c?.widgetType || "").toLowerCase();
      return (
        t.includes("display_card") ||
        t.includes("input_group") ||
        t.includes("action_button")
      );
    });

  return (
    <PageErrorBoundary pageId={pageId} pageTitle={blueprint?.pageTitle || `Page #${pageId}`}>
      <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/50 to-indigo-50/20 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-5xl">
          {/* Top Navigation Bar */}
          <nav className="mb-6 flex flex-wrap items-center justify-between gap-4">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 active:scale-95"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              <span>Back to Dashboard</span>
            </Link>

            <div className="flex items-center gap-3 text-xs">
              <span className="rounded-full bg-indigo-50 px-3 py-1 font-mono font-medium text-indigo-700 border border-indigo-200">
                User: {username} · [{Array.isArray(userRoles) ? userRoles.join(",") : userRoles}]
              </span>
              <span className="hidden sm:inline-block rounded-full bg-emerald-50 px-2.5 py-0.5 font-mono text-[11px] text-emerald-700 border border-emerald-200">
                RBAC Active
              </span>
            </div>
          </nav>

          {/* 403 Forbidden State (Role not authorized for this template) */}
          {!isAuthorized ? (
            <div className="overflow-hidden rounded-3xl border border-rose-200 bg-white shadow-xl">
              <div className="border-b border-rose-100 bg-rose-50/80 px-8 py-6 text-center">
                <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-100 text-2xl text-rose-600 shadow-sm">
                  🚫
                </div>
                <h2 className="text-xl font-extrabold text-rose-950">
                  403 Forbidden — Access Denied
                </h2>
                <p className="mt-1 text-xs text-rose-700 max-w-md mx-auto">
                  Your current role profile is not authorized to access this dynamic template under banking policy.
                </p>
              </div>

              <div className="p-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5 font-mono text-xs text-slate-700 space-y-2 mb-6">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Template Name:</span>
                    <span className="font-bold text-slate-900">{blueprint?.pageTitle} (Page #{pageId})</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Required Roles (SVRD_ALLOWED_ROLES):</span>
                    <span className="font-semibold text-rose-600">{blueprint?.allowedRoles}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Your Assigned Roles:</span>
                    <span className="font-semibold text-indigo-600">
                      {Array.isArray(userRoles) ? userRoles.join(", ") : userRoles}
                    </span>
                  </div>
                </div>

                <div className="flex justify-center">
                  <Link
                    href="/dashboard"
                    className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white shadow-md hover:bg-indigo-700 transition"
                  >
                    Return to Authorized Services
                  </Link>
                </div>
              </div>
            </div>
          ) : errorDetails ? (
            /* Error / 404 Diagnostic State */
            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-lg">
              <div className="border-b border-red-100 bg-red-50/80 px-6 py-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-red-100 text-red-600">
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-red-900">
                      Blueprint JSON Load Error (Status {errorDetails.status})
                    </h2>
                    <p className="text-xs text-red-700">{errorDetails.message}</p>
                  </div>
                </div>
              </div>

              <div className="p-6">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Authorized JSON Blueprints Available to Your Role:
                </h3>
                {errorDetails.availableBlueprints?.length > 0 ? (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {errorDetails.availableBlueprints.map((item) => (
                      <Link
                        key={item.pageId}
                        href={`/dynamic-page/${item.pageId}`}
                        className="group flex flex-col justify-between rounded-xl border border-slate-200 p-4 transition hover:border-indigo-500 hover:shadow-md bg-slate-50/50 hover:bg-white"
                      >
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-xs font-semibold text-indigo-600 group-hover:underline">
                              {item.fileName}
                            </span>
                            {item.isDynamic && (
                              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                                Dynamic
                              </span>
                            )}
                          </div>
                          <p className="text-sm font-medium text-slate-800 line-clamp-1">
                            {item.title}
                          </p>
                        </div>
                        <span className="mt-3 text-[11px] text-slate-400 group-hover:text-indigo-600">
                          Click to load →
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-500">
                    No authorized JSON files available for your assigned roles.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <>
              {/* Inspection Bar & JSON Source Viewer */}
              <JsonBlueprintInspector
                blueprint={blueprint}
                meta={meta}
                availableBlueprints={availableBlueprints}
              />

              {/* Dynamic Content Container */}
              <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-6 md:p-8 shadow-sm backdrop-blur-sm">
                {hasDynamicWidgets ? (
                  <SduiDynamicEngine blueprint={blueprint} />
                ) : (
                  <>
                    <header className="mb-8 border-b border-slate-100 pb-4">
                      <div className="flex items-center gap-2">
                        <span className="rounded-md bg-indigo-50 px-2 py-0.5 font-mono text-xs font-semibold text-indigo-600">
                          ID #{pageId}
                        </span>
                        <span className="text-xs font-medium uppercase tracking-wider text-slate-400">
                          Layout: {blueprint?.layoutType || "VERTICAL_STACK"}
                        </span>
                        {blueprint?.allowedRoles && (
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                            Roles: {blueprint.allowedRoles}
                          </span>
                        )}
                      </div>
                      <h1 className="mt-2 text-2xl md:text-3xl font-extrabold text-slate-900 tracking-tight">
                        {blueprint?.pageTitle || "Untitled Dynamic Page"}
                      </h1>
                    </header>
                    <SduiRenderer blueprint={blueprint} />
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </main>
    </PageErrorBoundary>
  );
}
