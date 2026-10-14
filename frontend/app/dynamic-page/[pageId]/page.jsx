/**
 * Dynamic Page (App Router — Server Component)
 * --------------------------------------------------------------------
 * Route: /dynamic-page/[pageId]
 *
 * This file is a Next.js Server Component. It reads the dynamic route
 * param, fetches the blueprint (currently mocked), normalizes the
 * payload, and hands it to the client-side <SduiRenderer />.
 *
 * Note on split: the renderer must be a Client Component because the
 * form it hosts uses hooks. Server → client prop passing is supported
 * natively by App Router as long as the values are serializable.
 */

import SduiRenderer from "@/components/SduiRenderer";
import { fetchBlueprint, normalizeBlueprint } from "@/lib/mockBlueprint";

export default async function DynamicPage({ params }) {
  const pageId = params?.pageId;

  let blueprint;
  let errorMessage = null;

  try {
    const raw = await fetchBlueprint(pageId);
    blueprint = normalizeBlueprint(raw);
  } catch (err) {
    // Defensive: any failure (404, network, parse) becomes a friendly
    // message. Never lets the route throw — that would 500 the whole app.
    errorMessage =
      err?.message || "Unable to load this page. Please try again later.";
    blueprint = { pageTitle: "Error", layoutType: "VERTICAL_STACK", components: [] };
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-brand-700">
          Page #{pageId}
        </p>
        <h1 className="mt-1 text-3xl font-bold text-slate-900">
          {blueprint?.pageTitle || "Untitled Page"}
        </h1>
      </header>

      {errorMessage ? (
        <div
          role="alert"
          className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {errorMessage}
        </div>
      ) : null}

      <SduiRenderer blueprint={blueprint} />
    </main>
  );
}
