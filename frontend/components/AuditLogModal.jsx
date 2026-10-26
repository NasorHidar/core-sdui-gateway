"use client";

import React, { useState, useEffect, useCallback } from "react";
import useAppStore from "@/store/useAppStore";

export default function AuditLogModal({ isOpen, onClose }) {
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [filterAction, setFilterAction] = useState("ALL");
  const [expandedLogId, setExpandedLogId] = useState(null);
  const jwtToken = useAppStore((s) => s.jwtToken);

  const fetchLogs = useCallback(async () => {
    if (!jwtToken) return;
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        fetch("/api/v1/audit/logs", {
          headers: { Authorization: `Bearer ${jwtToken}` },
        }),
        fetch("/api/v1/audit/stats", {
          headers: { Authorization: `Bearer ${jwtToken}` },
        }),
      ]);

      if (logsRes.ok) {
        const data = await logsRes.json();
        setLogs(Array.isArray(data) ? data : []);
      }
      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }
    } catch (err) {
      console.error("[AuditLogModal] Failed to fetch audit logs:", err);
    } finally {
      setLoading(false);
    }
  }, [jwtToken]);

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen, fetchLogs]);

  if (!isOpen) return null;

  const filteredLogs = logs.filter((log) => {
    if (filterAction === "ALL") return true;
    return (log.actLogAction || "").toUpperCase().includes(filterAction);
  });

  const getActionBadge = (action = "") => {
    const act = action.toUpperCase();
    if (act.includes("SEARCH")) {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    if (act.includes("FORM") || act.includes("TRANSFER")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (act.includes("ROUTING") || act.includes("CONFIRM")) {
      return "bg-indigo-50 text-indigo-700 border-indigo-200";
    }
    return "bg-slate-100 text-slate-700 border-slate-200";
  };

  const parsePayload = (payload) => {
    if (!payload) return null;
    try {
      return typeof payload === "string" ? JSON.parse(payload) : payload;
    } catch {
      return payload;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col rounded-3xl border border-slate-200 bg-white shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-sm">
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">
                  Comprehensive Activity Log & Audit Trail
                </h3>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>Oracle 23ai CLOB</span>
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Non-blocking Kafka audit pipeline capturing user IDs, requested payloads, endpoints, and statuses.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 active:scale-95 transition"
            >
              <svg className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh</span>
            </button>
            <button
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-2 gap-3 border-b border-slate-100 bg-white p-4 sm:grid-cols-4 text-xs">
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Total Audit Records</span>
            <span className="font-bold text-slate-800 text-sm">{stats?.totalLoggedEvents || logs.length} Events</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Messaging Pipeline</span>
            <span className="font-bold text-emerald-700 text-sm">Apache Kafka · Non-Blocking</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Storage Architecture</span>
            <span className="font-bold text-indigo-700 text-sm">Oracle 23ai CLOB</span>
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-2.5">
            <span className="block text-[10px] uppercase font-semibold text-slate-400">Compliance Policy</span>
            <span className="font-bold text-slate-800 text-sm">Full Traceability Active</span>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-6 py-2.5 bg-slate-50/40">
          <span className="text-xs font-semibold text-slate-500 mr-2">Filter Action:</span>
          {["ALL", "SEARCH", "FORM", "ROUTING"].map((act) => (
            <button
              key={act}
              onClick={() => setFilterAction(act)}
              className={`rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                filterAction === act
                  ? "bg-indigo-600 text-white shadow-sm"
                  : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
              }`}
            >
              {act === "ALL" ? "All Interactions" : act === "SEARCH" ? "Search Queries" : act === "FORM" ? "Form Submissions" : "API Routing"}
            </button>
          ))}
          <span className="ml-auto text-xs text-slate-400">
            Showing {filteredLogs.length} recent events
          </span>
        </div>

        {/* Audit Log Table */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && logs.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-slate-400">
              <svg className="h-8 w-8 animate-spin text-indigo-600 mb-2" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>Fetching live ACTIVITY_LOG records...</span>
            </div>
          ) : filteredLogs.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 p-8 text-center text-sm text-slate-400">
              No audit records matching filter criteria.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((item) => {
                const parsed = parsePayload(item.actLogPayload);
                const isExpanded = expandedLogId === item.actLogId;
                const endpoint = parsed?.targetEndpoint || parsed?.endpoint || "—";
                const status = parsed?.executionStatus || parsed?.status || "SUCCESS";

                return (
                  <div
                    key={item.actLogId || item.actLogEventId}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs transition hover:border-slate-300"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono text-xs font-bold text-slate-800">
                          #{item.actLogId}
                        </span>
                        <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold ${getActionBadge(item.actLogAction)}`}>
                          {item.actLogAction}
                        </span>
                        <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                          user: {item.actLogUserId}
                        </span>
                        {item.actLogReferenceKey && (
                          <span className="font-mono text-xs text-indigo-700 font-semibold">
                            ref: {item.actLogReferenceKey}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 border border-emerald-200">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500"></span>
                          <span>{status}</span>
                        </span>
                        <span className="font-mono text-[11px] text-slate-500">
                          {item.actLogCreatedAt ? new Date(item.actLogCreatedAt).toLocaleTimeString() : "—"}
                        </span>
                        <button
                          type="button"
                          onClick={() => setExpandedLogId(isExpanded ? null : item.actLogId)}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 transition"
                        >
                          {isExpanded ? "Hide Payload" : "View Payload"}
                        </button>
                      </div>
                    </div>

                    <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                      <span>
                        <strong className="text-slate-700">Target Endpoint:</strong> <code className="font-mono text-slate-800">{endpoint}</code>
                      </span>
                      <span>·</span>
                      <span>
                        <strong className="text-slate-700">Source IP:</strong> <code className="font-mono text-slate-800">{item.actLogSourceIp || "127.0.0.1"}</code>
                      </span>
                      <span>·</span>
                      <span>
                        <strong className="text-slate-700">Event ID:</strong> <code className="font-mono text-[11px] text-slate-600 truncate max-w-[140px] inline-block align-bottom">{item.actLogEventId}</code>
                      </span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 p-3">
                        <span className="block text-[11px] font-semibold uppercase tracking-wider text-slate-500 mb-1">
                          Full CLOB Request/Response Payload
                        </span>
                        <pre className="max-h-48 overflow-auto rounded-lg bg-slate-900 p-3 font-mono text-[11px] text-emerald-400">
                          {JSON.stringify(parsed, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
