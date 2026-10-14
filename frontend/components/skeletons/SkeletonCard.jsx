/**
 * SkeletonCard
 * --------------------------------------------------------------------
 * Pure presentational card. The renderer passes the entire `props`
 * object from the SDUI blueprint; we defensively destructure with
 * defaults so a malformed payload never produces a white screen.
 *
 * Blueprint contract:
 *   {
 *     "type": "Skeleton_Card",
 *     "id":   "info_card_1",
 *     "props": { "title": "...", "content": "..." }
 *   }
 */

export default function SkeletonCard({ title = "Untitled Card", content = "" }) {
  return (
    <section
      className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm
                 transition hover:shadow-md focus-within:ring-2 focus-within:ring-brand-500"
    >
      <h3 className="text-lg font-semibold text-slate-900">{title}</h3>
      {content ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{content}</p>
      ) : null}
    </section>
  );
}
