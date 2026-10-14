# SDUI Forge

A **Server-Driven UI (SDUI) Metadata Engine** for a core banking environment. The backend ships a JSON blueprint; the frontend mounts React components dynamically — no hardcoded routes, no app releases for UI changes.

> **Phase 1** = Backend (Spring Boot 3.4 + Oracle 23ai). ✅ Complete.
> **Phase 2** = Frontend Skeleton & Master UI Renderer (Next.js 14 App Router). ✅ Complete.

---

## Repository Layout

```
core-sdui-gateway/
├── pom.xml                        # Spring Boot backend (Phase 1)
├── src/                           # Java sources (Phase 1)
├── target/                        # Maven build output
├── phase1_deliverables.md         # Phase 1 architecture, API contract, DDL
├── phase2_deliverables.md         # Phase 2 architecture, file index, decisions
└── frontend/                      # Next.js app (Phase 2)
    ├── app/
    │   ├── layout.jsx
    │   ├── globals.css
    │   └── dynamic-page/[pageId]/page.jsx
    ├── components/
    │   ├── SduiRenderer.jsx       # Recursive engine
    │   └── skeletons/
    │       ├── SkeletonCard.jsx
    │       ├── SkeletonForm.jsx
    │       └── UnknownComponent.jsx   # Registry fallback
    ├── lib/
    │   └── mockBlueprint.js       # Mock fetch + payload normalizer
    ├── utils/
    │   └── componentRegistry.js   # type → component map
    ├── jsconfig.json              # @/* path alias
    ├── next.config.mjs
    ├── postcss.config.mjs
    ├── tailwind.config.js
    ├── package.json
    └── .gitignore
```

---

## Quick Start (Phase 2 Frontend)

```bash
cd frontend
npm install
npm run dev
```

Open <http://localhost:3000/dynamic-page/101> for the happy path, or `/dynamic-page/999` to see the registry fallback in action.

### Production build

```bash
cd frontend
npm run build
npm run start
```

---

## How It Works

1. **Request** — Browser hits `GET /dynamic-page/{pageId}`.
2. **Fetch** — The Server Component calls `fetchBlueprint(pageId)` (currently mocked in `lib/mockBlueprint.js`; replace with a real `fetch` against the Phase-1 Spring Boot API when ready).
3. **Normalize** — The payload is folded into `{ pageTitle, layoutType, components[] }`. The adapter handles both the Phase-2 spec shape and the live Phase-1 `uiBlueprint.widgets` shape.
4. **Render** — `SduiRenderer` maps each node through `componentRegistry.resolve(type)`, which returns either a real component or `UnknownComponent` (fallback). Nodes are mounted with stable, `id`-based React keys.
5. **Compose** — The `layoutType` from the blueprint picks a Tailwind wrapper (`VERTICAL_STACK` / `HORIZONTAL_STACK` / `GRID`).

---

## Extending the Registry

Adding a new widget is a two-step process:

1. Create the component in `components/skeletons/` (keep it presentational, with default props).
2. Add an entry to `REGISTRY` in `utils/componentRegistry.js`:

```js
import SkeletonTable from "@/components/skeletons/SkeletonTable";

const REGISTRY = {
  Skeleton_Card:  SkeletonCard,
  Skeleton_Form:  SkeletonForm,
  Skeleton_Table: SkeletonTable,   // ← new
};
```

No other code changes. The renderer will pick it up automatically the next time the backend references `"type": "Skeleton_Table"`.

---

## Safety in Plain JavaScript

There is no TypeScript safety net, so the engine is built defensively:

- **Registry fallback** — unknown `type` → `UnknownComponent` (visible warning, page stays alive).
- **Default props** — every skeleton has sensible defaults so a partial blueprint still renders.
- **Array coercion** — `blueprint.components` is treated as `[]` when missing or non-array.
- **Try/catch in the Server Component** — any fetch/parse failure becomes a friendly inline alert; the route never 500s.
- **Input-type whitelist** in `SkeletonForm` — backend-supplied `inputType` is validated before reaching the DOM.
- **Optional chaining throughout** — `node?.props?.title`, `blueprint?.components ?? []`, etc.

---

## Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 14 (App Router) |
| UI | React 18 |
| Language | JavaScript (ES6+ / JSX) — **no TypeScript** |
| Styling | Tailwind CSS 3.4 |
| Backend (Phase 1) | Spring Boot 3.4, Spring Data JDBC, Oracle 23ai |

---

## Roadmap

| Phase | Scope | Status |
|-------|-------|--------|
| 1 | Backend APIs, Oracle schema, JSON blueprint model | ✅ Done |
| 2 | Frontend skeleton, registry, recursive renderer | ✅ Done |
| 3 | React Hook Form + Zod, action dispatch (`actionId` → API), real backend wiring | ⏭ Next |
| 4 | Auth + role-gated rendering, menu tree consumption | ⏳ Planned |
| 5 | New widgets (Table, Chart, Modal), lazy loading, error boundaries per-node | ⏳ Planned |

---

## Documentation

- [`phase1_deliverables.md`](./phase1_deliverables.md) — Backend architecture, API contract, DDL, design decisions.
- [`phase2_deliverables.md`](./phase2_deliverables.md) — Frontend architecture, file index, blueprint contract, design decisions.
