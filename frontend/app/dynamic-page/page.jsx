import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { listAvailableBlueprints } from "@/lib/jsonBlueprintLoader";
import { parseJwt, isRoleAuthorized, isTokenExpired } from "@/utils/rbac";

export const metadata = {
  title: "SDUI Dynamic Blueprints Directory | SDUI Forge",
  description: "Browse and preview server-driven UI blueprints authorized for your role.",
};

export default async function DynamicPageIndex() {
  const cookieStore = cookies();
  const tokenCookie = cookieStore.get("sdui_jwt")?.value;

  if (!tokenCookie || isTokenExpired(tokenCookie)) {
    redirect("/login?redirect=/dynamic-page&reason=expired");
  }

  const payload = parseJwt(tokenCookie);
  const userRoles = payload?.roles || [];
  const username = payload?.sub || "User";

  const allBlueprints = await listAvailableBlueprints();
  // Filter blueprints strictly by the user's assigned roles
  const blueprints = allBlueprints.filter((b) =>
    isRoleAuthorized(userRoles, b.allowedRoles)
  );

  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100/50 to-indigo-50/20 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        {/* Top Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-indigo-600 active:scale-95"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Dashboard</span>
          </Link>

          <div className="flex items-center gap-3">
            <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
              User: {username} · [{Array.isArray(userRoles) ? userRoles.join(",") : userRoles}]
            </span>
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700 border border-emerald-200">
              {blueprints.length} Authorized
            </span>
          </div>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900">
            Authorized Dynamic UI Blueprints
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Rendering restricted to blueprints matching your assigned roles (
            <code className="rounded bg-indigo-50 px-1 py-0.5 font-mono text-xs text-indigo-700">
              SVRD_ALLOWED_ROLES
            </code>
            ). Unassigned modules are automatically omitted from this directory.
          </p>
        </div>

        {/* Grid of Available Blueprints */}
        {blueprints.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-700">
              No dynamic blueprints authorized for your role profile.
            </p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {blueprints.map((item) => (
              <Link
                key={item.pageId}
                href={`/dynamic-page/${item.pageId}`}
                className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-500 hover:shadow-md"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-xs font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                      {item.fileName}
                    </span>
                    {item.isDynamic ? (
                      <span className="rounded-md bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
                        ⚡ 100% Dynamic Engine
                      </span>
                    ) : (
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                        Skeleton Component
                      </span>
                    )}
                  </div>
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {item.title}
                  </h2>
                  <p className="mt-1 text-xs text-slate-400">
                    {item.widgetCount} widgets/components · {item.sizeBytes} bytes
                  </p>
                  {item.allowedRoles && (
                    <p className="mt-2 text-[10px] font-mono text-slate-400">
                      Allowed: {item.allowedRoles}
                    </p>
                  )}
                </div>

                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-indigo-600">
                  <span>Launch Dynamic Page</span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
