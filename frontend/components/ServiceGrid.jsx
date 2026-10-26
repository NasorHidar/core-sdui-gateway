"use client";

import useAppStore from "@/store/useAppStore";

const SERVICE_ICONS = {
  "Retail Core Banking": "🏦",
  "Cards & Electronic Payments": "💳",
  "Lending & Credit Facilities": "📊",
};

const CARD_GRADIENTS = [
  "from-indigo-500 to-blue-600",
  "from-emerald-500 to-teal-600",
  "from-amber-500 to-orange-600",
  "from-violet-500 to-purple-600",
  "from-rose-500 to-pink-600",
  "from-cyan-500 to-sky-600",
];

export default function ServiceGrid() {
  const mainServices = useAppStore((s) => s.mainServices);
  const selectService = useAppStore((s) => s.selectService);
  const user = useAppStore((s) => s.user);

  return (
    <div className="mx-auto max-w-5xl">
      {/* Dynamic Dashboard Header & Database Source Context */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b border-slate-200/80 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="flex h-2.5 w-2.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 font-mono">
              Dynamic Primary Services (SERVICE Table)
            </span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Primary Service Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-500">
            Rendered dynamically based on SVR_IS_ACTIVE status and SVR_SORT_ORDER sequence from Oracle 23ai.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200">
            <span>Role: {user?.roles || "AUTHENTICATED"}</span>
          </span>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-mono font-medium text-emerald-700 border border-emerald-200">
            {mainServices.length} Active Services
          </span>
        </div>
      </div>

      {/* Grid */}
      {mainServices.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 bg-white p-12 text-center shadow-sm">
          <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-50 text-2xl text-amber-600">
            🔒
          </div>
          <h3 className="text-base font-bold text-slate-800">
            No Primary Services Active or Authorized
          </h3>
          <p className="mt-1 max-w-sm text-xs text-slate-500">
            No active services in the SERVICE table match your current user role profile ({user?.roles || "None"}).
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mainServices.map((service, i) => {
            const subServices = service.children || [];
            return (
              <button
                key={service.id}
                onClick={() => selectService(service)}
                className="group relative flex flex-col justify-between overflow-hidden rounded-3xl border border-slate-200/90 bg-white p-6 text-left shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-indigo-500 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {/* Gradient accent bar */}
                <div
                  className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${
                    CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                  } opacity-90 transition-all group-hover:h-2`}
                />

                <div>
                  {/* Top badges: Sort order + Active status */}
                  <div className="mb-3 flex items-center justify-between">
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] font-semibold text-slate-700">
                      Sort Order #{service.sortOrder ?? i + 1}
                    </span>
                    <span className="flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                      Active
                    </span>
                  </div>

                  {/* Icon */}
                  <div
                    className={`mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br ${
                      CARD_GRADIENTS[i % CARD_GRADIENTS.length]
                    } text-2xl text-white shadow-md`}
                  >
                    {service.icon || SERVICE_ICONS[service.name] || "📁"}
                  </div>

                  {/* Title */}
                  <h2 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition">
                    {service.name}
                  </h2>

                  {/* Base API URL */}
                  {service.baseApiUrl && (
                    <p className="mt-1 font-mono text-[10px] text-slate-400">
                      {service.baseApiUrl}
                    </p>
                  )}

                  {/* Sub-service pills */}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {subServices.map((sub) => (
                      <span
                        key={sub.menuId}
                        className="rounded-md bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-600 border border-slate-200/70"
                      >
                        {sub.menuName}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex items-center justify-between border-t border-slate-100 pt-3 text-xs text-slate-400 group-hover:text-indigo-600 font-medium">
                  <span>
                    {subServices.length} sub-service{subServices.length !== 1 ? "s" : ""}
                  </span>
                  <span className="transition-transform group-hover:translate-x-1">→</span>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
