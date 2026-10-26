"use client";

import { useState, useMemo, useEffect } from "react";
import useAppStore from "@/store/useAppStore";

/**
 * Helper to recursively search an arbitrary-depth menu tree.
 * Preserves parent nodes if any of their descendants match the query.
 */
function filterTreeBySearch(nodes, query) {
  if (!nodes || !Array.isArray(nodes)) return [];
  if (!query || !query.trim()) return nodes;

  const lowerQuery = query.toLowerCase().trim();

  return nodes
    .map((node) => {
      const nameMatches = (node.menuName || "").toLowerCase().includes(lowerQuery);
      const idMatches = String(node.pageId || node.menuId || "").includes(lowerQuery);
      const isSelfMatch = nameMatches || idMatches;

      const filteredChildren =
        Array.isArray(node.children) && node.children.length > 0
          ? filterTreeBySearch(node.children, query)
          : [];

      if (isSelfMatch || filteredChildren.length > 0) {
        return {
          ...node,
          children: filteredChildren,
        };
      }
      return null;
    })
    .filter(Boolean);
}

/**
 * Helper to collect all folder node IDs in a tree (used for Expand All).
 */
function getAllFolderIds(nodes) {
  let ids = [];
  if (!Array.isArray(nodes)) return ids;
  for (const node of nodes) {
    if (Array.isArray(node.children) && node.children.length > 0) {
      ids.push(node.menuId);
      ids = ids.concat(getAllFolderIds(node.children));
    }
  }
  return ids;
}

/**
 * Helper to count total leaf items in a tree.
 */
function countLeafNodes(nodes) {
  if (!Array.isArray(nodes)) return 0;
  let count = 0;
  for (const node of nodes) {
    if (Array.isArray(node.children) && node.children.length > 0) {
      count += countLeafNodes(node.children);
    } else {
      count += 1;
    }
  }
  return count;
}

/**
 * Recursive Tree Node Component supporting arbitrary nesting depth
 */
function NestedMenuNode({
  node,
  depth = 0,
  selectedSubService,
  onSelectSubService,
  expandedIds,
  onToggleExpand,
}) {
  const hasChildren = Array.isArray(node.children) && node.children.length > 0;
  const isExpanded = expandedIds.has(node.menuId);

  // Check if this node or any child is currently selected
  const isDirectlyActive =
    selectedSubService &&
    (selectedSubService.menuId === node.menuId ||
      (node.pageId && selectedSubService.pageId === node.pageId && !hasChildren));

  const containsActiveChild = useMemo(() => {
    if (!hasChildren || !selectedSubService) return false;
    const checkActive = (items) =>
      items.some(
        (child) =>
          child.menuId === selectedSubService.menuId ||
          (child.pageId && child.pageId === selectedSubService.pageId) ||
          (child.children && checkActive(child.children))
      );
    return checkActive(node.children);
  }, [hasChildren, selectedSubService, node.children]);

  // Leaf Node (Clickable sub-service item)
  if (!hasChildren) {
    return (
      <li className="relative">
        <button
          onClick={() => onSelectSubService(node)}
          title={`${node.menuName} (Page #${node.pageId || node.menuId})`}
          className={`
            group flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all duration-150
            ${
              isDirectlyActive
                ? "bg-indigo-600 font-semibold text-white shadow-sm ring-1 ring-indigo-500"
                : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
            }
          `}
          style={{ paddingLeft: `${Math.max(10, depth * 14 + 10)}px` }}
        >
          <div className="flex min-w-0 items-center gap-2">
            {/* Active Indicator dot */}
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full transition-all ${
                isDirectlyActive
                  ? "bg-white shadow"
                  : "bg-slate-300 group-hover:bg-indigo-500"
              }`}
            />
            <span className="truncate">{node.menuName}</span>
          </div>

          {/* Page ID / Menu ID Badge */}
          {(node.pageId || node.menuId) && (
            <span
              className={`shrink-0 rounded px-1.5 py-0.5 font-mono text-[9px] transition-colors ${
                isDirectlyActive
                  ? "bg-indigo-700/60 text-indigo-100"
                  : "bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700"
              }`}
            >
              #{node.pageId || node.menuId}
            </span>
          )}
        </button>
      </li>
    );
  }

  // Parent Folder Node (Collapsible menu group)
  return (
    <li className="relative">
      <div
        className={`
          group flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs font-medium transition-all
          ${
            containsActiveChild
              ? "text-indigo-900 bg-indigo-50/70"
              : "text-slate-700 hover:bg-slate-100"
          }
        `}
        style={{ paddingLeft: `${Math.max(8, depth * 14 + 8)}px` }}
      >
        {/* Toggle Folder Button */}
        <button
          type="button"
          onClick={() => onToggleExpand(node.menuId)}
          className="flex min-w-0 flex-1 items-center gap-1.5 text-left focus:outline-none"
        >
          {/* Chevron icon with rotate animation */}
          <svg
            className={`h-3.5 w-3.5 shrink-0 text-slate-400 transition-transform duration-200 group-hover:text-indigo-600 ${
              isExpanded ? "rotate-90 text-indigo-600" : ""
            }`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>

          {/* Folder Icon */}
          <span className="text-xs">
            {isExpanded ? "📂" : "📁"}
          </span>

          {/* Menu Title */}
          <span className="truncate font-semibold tracking-tight">
            {node.menuName}
          </span>
        </button>

        {/* Child Count Badge */}
        <span
          onClick={() => onToggleExpand(node.menuId)}
          className="ml-1 shrink-0 cursor-pointer rounded-full bg-slate-200/80 px-1.5 py-0.5 text-[9px] font-semibold text-slate-600 transition group-hover:bg-indigo-100 group-hover:text-indigo-700"
        >
          {node.children.length}
        </span>
      </div>

      {/* Recursive Children with Vertical Connector Guide Line */}
      {isExpanded && (
        <ul className="relative mt-0.5 space-y-0.5 border-l-2 border-slate-200/90 ml-3.5 pl-1.5 transition-all">
          {node.children.map((child) => (
            <NestedMenuNode
              key={child.menuId || `${node.menuId}-${child.menuName}`}
              node={child}
              depth={depth + 1}
              selectedSubService={selectedSubService}
              onSelectSubService={onSelectSubService}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

/**
 * LeftSidebar
 * ─────────────────────────────────────────────────────────────────────────────
 * Renders the multi-level hierarchical sub-service navigation menu for the
 * currently selected primary service.
 */
export default function LeftSidebar() {
  const selectedService = useAppStore((s) => s.selectedService);
  const selectedSubService = useAppStore((s) => s.selectedSubService);
  const selectSubService = useAppStore((s) => s.selectSubService);
  const goHome = useAppStore((s) => s.goHome);
  const subServicesLoading = useAppStore((s) => s.subServicesLoading);
  const subServicesError = useAppStore((s) => s.subServicesError);
  const fetchSubServicesForService = useAppStore((s) => s.fetchSubServicesForService);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedIds, setExpandedIds] = useState(new Set());

  const subServicesTree = useMemo(
    () => selectedService?.children || [],
    [selectedService?.children]
  );

  // Initialize all top-level folders to expanded by default when service changes
  useEffect(() => {
    if (subServicesTree.length > 0) {
      const initialIds = new Set();
      subServicesTree.forEach((node) => {
        if (node.children && node.children.length > 0) {
          initialIds.add(node.menuId);
        }
      });
      setExpandedIds(initialIds);
    }
  }, [subServicesTree]);

  // Filter tree based on search query
  const filteredTree = useMemo(() => {
    return filterTreeBySearch(subServicesTree, searchQuery);
  }, [subServicesTree, searchQuery]);

  // If user is searching, auto-expand all folders that match
  useEffect(() => {
    if (searchQuery.trim()) {
      const allMatchingFolderIds = getAllFolderIds(filteredTree);
      setExpandedIds(new Set(allMatchingFolderIds));
    }
  }, [searchQuery, filteredTree]);

  if (!selectedService) return null;

  const totalLeafCount = countLeafNodes(subServicesTree);

  const toggleExpand = (menuId) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(menuId)) {
        next.delete(menuId);
      } else {
        next.add(menuId);
      }
      return next;
    });
  };

  const expandAll = () => {
    const allFolderIds = getAllFolderIds(filteredTree);
    setExpandedIds(new Set(allFolderIds));
  };

  const collapseAll = () => {
    setExpandedIds(new Set());
  };

  return (
    <nav className="flex h-full flex-col select-none" aria-label="Hierarchical Sub-service Navigation">
      {/* ── 1. Service Header ────────────────────────────────────────────── */}
      <div className="border-b border-slate-100 bg-white px-4 py-3.5">
        <button
          onClick={goHome}
          className="group mb-2.5 flex items-center gap-1.5 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
        >
          <svg
            className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          All Services
        </button>

        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 className="truncate text-sm font-bold text-slate-900 leading-tight">
              {selectedService.name}
            </h2>
            <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-400">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>
                {subServicesLoading
                  ? "Loading sub-services…"
                  : `${totalLeafCount} accessible sub-service${totalLeafCount !== 1 ? "s" : ""}`}
              </span>
            </div>
          </div>
          <span className="text-xl shrink-0">{selectedService.icon || "🏦"}</span>
        </div>
      </div>

      {/* ── 2. Search & Expand/Collapse Controls ─────────────────────────── */}
      <div className="border-b border-slate-100 bg-slate-50/70 px-3 py-2">
        <div className="relative mb-2">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter sub-services…"
            className="w-full rounded-md border border-slate-200 bg-white py-1.5 pl-7 pr-7 text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
          <svg
            className="absolute left-2 top-2 h-3.5 w-3.5 text-slate-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
              title="Clear search"
            >
              ×
            </button>
          )}
        </div>

        <div className="flex items-center justify-between text-[10px] text-slate-500">
          <span className="font-medium uppercase tracking-wider text-slate-400">Hierarchy</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={expandAll}
              className="hover:text-indigo-600 transition"
              title="Expand all menu folders"
            >
              Expand All
            </button>
            <span className="text-slate-300">|</span>
            <button
              type="button"
              onClick={collapseAll}
              className="hover:text-indigo-600 transition"
              title="Collapse all menu folders"
            >
              Collapse
            </button>
          </div>
        </div>
      </div>

      {/* ── 3. Hierarchical Menu Tree ────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {subServicesLoading ? (
          /* Loading skeleton */
          <div className="space-y-2 p-2">
            <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
            <div className="ml-3 space-y-1.5 border-l-2 border-slate-200 pl-2">
              <div className="h-4 w-5/6 animate-pulse rounded bg-slate-200/80" />
              <div className="h-4 w-2/3 animate-pulse rounded bg-slate-200/80" />
            </div>
            <div className="h-5 w-4/5 animate-pulse rounded bg-slate-200" />
            <div className="h-5 w-1/2 animate-pulse rounded bg-slate-200" />
          </div>
        ) : filteredTree.length === 0 ? (
          <div className="p-4 text-center">
            <p className="text-xs font-medium text-slate-500">
              {searchQuery ? "No matching sub-services" : "No sub-services authorized"}
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-xs font-semibold text-indigo-600 hover:underline"
              >
                Clear filter
              </button>
            )}
          </div>
        ) : (
          <ul className="space-y-0.5" role="tree">
            {filteredTree.map((node) => (
              <NestedMenuNode
                key={node.menuId}
                node={node}
                depth={0}
                selectedSubService={selectedSubService}
                onSelectSubService={selectSubService}
                expandedIds={expandedIds}
                onToggleExpand={toggleExpand}
              />
            ))}
          </ul>
        )}
      </div>

      {/* ── 4. Error Retry Banner (if any) ───────────────────────────────── */}
      {subServicesError && (
        <div className="border-t border-amber-200 bg-amber-50 p-2.5 text-[11px] text-amber-800">
          <div className="flex items-center justify-between">
            <span className="truncate">Using cached/offline menu</span>
            <button
              onClick={() => fetchSubServicesForService(selectedService.id, selectedService)}
              className="ml-2 font-semibold text-indigo-600 hover:underline"
            >
              Retry
            </button>
          </div>
        </div>
      )}

      {/* ── 5. Sidebar Footer ────────────────────────────────────────────── */}
      <div className="border-t border-slate-100 bg-slate-50/50 px-3.5 py-2.5">
        <div className="flex items-center justify-between text-[10px] text-slate-400">
          <span className="font-mono">SERVICE_DETAILS</span>
          <span className="rounded bg-slate-100 px-1.5 py-0.5 font-medium text-slate-500">
            Multi-level SDUI
          </span>
        </div>
      </div>
    </nav>
  );
}
