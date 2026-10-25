"use client";

import useAppStore from "@/store/useAppStore";

/**
 * ServiceGrid
 * ─────────────────────────────────────────────────────────────────────────────
 * Landing view inside /dashboard.
 * Displays the main banking services as an interactive card grid.
 * Clicking a service card updates the Zustand store, which:
 *   - Populates the LeftSidebar with sub-services
 *   - Keeps the main content area on the search prompt box (until user selects a sub-service)
 */

// Service icons (emoji fallback — replace with SVG when icon system is available)
const SERVICE_ICONS = {
  "Retail Core Banking": "🏦",
  "Cards & Electronic Payments": "💳",
  "Lending & Credit Facilities": "📊",
};

// Gradient palette for service cards
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

  return (
    <div className="mx-auto max-w-4xl">
      {/* Section header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Banking Services
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Select a service to access its sub-modules and dynamic SDUI pages.
        </p>
      </div>

      {/* Grid */}
      {mainServices.length === 0 ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
          Loading services…
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {mainServices.map((service, i) => (
            <button
              key={service.id}
              onClick={() => selectService(service)}
              className="group relative overflow-hidden rounded-2xl border border-white/20 bg-white p-6 text-left shadow-md transition-all duration-200 hover:-translate-y-1 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
            >
              {/* Gradient accent bar */}
              <div
                className={`absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} opacity-80 transition-all group-hover:h-2`}
              />

              {/* Icon */}
              <div
                className={`mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]} text-2xl text-white shadow-lg`}
              >
                {service.icon || SERVICE_ICONS[service.name] || "📁"}
              </div>

              {/* Title */}
              <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-700 transition">
                {service.name}
              </h3>

              {/* Sub-count */}
              <p className="mt-1 text-xs text-slate-400">
                {(service.children || []).length} sub-service
                {(service.children || []).length !== 1 ? "s" : ""} available
              </p>

              {/* Arrow */}
              <div className="absolute bottom-5 right-5 flex h-8 w-8 items-center justify-center rounded-full bg-slate-100 text-slate-400 transition group-hover:bg-indigo-100 group-hover:text-indigo-600">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
