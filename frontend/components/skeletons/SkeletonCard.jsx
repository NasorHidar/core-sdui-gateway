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
      <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 mb-2">
        <h3 className="text-base font-semibold text-slate-900">{title}</h3>
        <span className="flex items-center gap-1 font-mono text-[9px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200 select-none">
          <span>🔒 Read-Only</span>
        </span>
      </div>
      {content ? (
        <p className="mt-2 text-sm leading-relaxed text-slate-600">{content}</p>
      ) : null}
    </section>
  );
}
