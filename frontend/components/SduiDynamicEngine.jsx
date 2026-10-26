"use client";

import React, { useState, useRef, useMemo } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { resolveWidget } from "@/components/widgets";
import { dispatchDynamicAction } from "@/utils/actionDispatcher";
import useAppStore from "@/store/useAppStore";
import TransactionReceiptCard from "@/components/TransactionReceiptCard";

/**
 * Fallback component for unregistered or malformed widget types.
 */
function UnknownWidgetFallback({ widgetType }) {
  return (
    <div className="rounded-2xl border border-dashed border-amber-300 bg-amber-50/50 p-4 text-xs text-amber-800">
      <span className="font-semibold">[SDUI Warning]</span> Unregistered widget
      type: <code className="font-mono text-amber-900">{widgetType || "(undefined)"}</code>
    </div>
  );
}

/**
 * SduiDynamicEngine
 * --------------------------------------------------------------------
 * Master Server-Driven UI (SDUI) Dynamic Form Generator & Execution Router.
 *
 * Core Capabilities:
 *   1. Parses `PAGE_UI_BLUEPRINT` JSON returned by backend gateway.
 *   2. Renders structured forms with dynamic layouts, sections, and controls.
 *   3. Strict Access Control:
 *      - System data fetched from backend JSON renders strictly as read-only.
 *      - Only specific, explicitly designated fields render as interactive inputs.
 *   4. Dynamic Action Buttons from PAGE_ACTION:
 *      - Configured dynamically via backend PAGE_ACTION table (e.g. "Execute Transaction", "Confirm").
 *   5. Context-Aware Execution & Aggregation:
 *      - Aggregates the complete dataset (read-only context + user inputs + metadata).
 *      - Transmits as final API request to the specific Business Layer endpoint.
 *
 * @param {Object} props
 * @param {Object} props.blueprint       - The JSON UI blueprint from backend.
 * @param {Function} [props.onSuccess]   - Optional success callback.
 * @param {Function} [props.onError]     - Optional error callback.
 */
export default function SduiDynamicEngine({
  blueprint,
  onSuccess,
  onError,
}) {
  const searchContext = useAppStore((s) => s.searchContext);
  const selectedSubService = useAppStore((s) => s.selectedSubService);

  const [submissionStatus, setSubmissionStatus] = useState({
    status: "idle", // 'idle' | 'success' | 'error'
    message: null,
    data: null,
  });

  const selectedActionRef = useRef(null);

  const methods = useForm({
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Extract safe widgets array supporting multiple schema variants
  const widgets = useMemo(
    () =>
      blueprint?.widgets ||
      blueprint?.components ||
      blueprint?.uiBlueprint?.widgets ||
      [],
    [blueprint]
  );

  const pageTitle = blueprint?.pageTitle || selectedSubService?.menuName || "Banking Service";

  /**
   * Resolve Dynamic Action Buttons:
   * Prioritize actions configured directly via backend PAGE_ACTION table (blueprint.actions),
   * then fallback to widget props, or default core banking action.
   */
  const configuredActions = useMemo(() => {
    // 1. Actions from backend PAGE_ACTION table
    if (Array.isArray(blueprint?.actions) && blueprint.actions.length > 0) {
      return blueprint.actions.map((act, idx) => ({
        id: act.actionId || act.actId || `act_${idx}`,
        label: act.actionName || act.actName || "Execute Transaction",
        endpoint: act.targetEndpoint || act.actTargetEndpoint || "/api/v1/core/transfers/execute",
        method: (act.httpMethod || act.actHttpMethod || "POST").toUpperCase(),
        type: act.actionType || act.actType || "BUSINESS_API",
        variant: act.variant || (idx === 0 ? "primary" : idx === 1 ? "emerald" : "secondary"),
      }));
    }

    // 2. Action_Button widget props inside blueprint
    const actionButtonWidget = widgets.find((w) => {
      const type = (w?.widgetType || w?.type || "").toLowerCase();
      return type.includes("action") || type.includes("button");
    });

    if (actionButtonWidget?.props) {
      return [
        {
          id: "action_widget_btn",
          label: actionButtonWidget.props.label || "Execute Transaction",
          endpoint: actionButtonWidget.props.actionMetadata?.endpoint || "/api/v1/core/transfers/execute",
          method: (actionButtonWidget.props.actionMetadata?.method || "POST").toUpperCase(),
          type: "BUSINESS_API",
          variant: actionButtonWidget.props.variant || "primary",
        },
      ];
    }

    // 3. Default fallback
    return [
      {
        id: "action_default",
        label: "Execute Transaction",
        endpoint: "/api/v1/core/transfers/execute",
        method: "POST",
        type: "BUSINESS_API",
        variant: "primary",
      },
    ];
  }, [blueprint, widgets]);

  /**
   * Context-Aware Submission Handler:
   * Aggregates the COMPLETE DATASET (Read-Only Context + User Inputs)
   * and routes to the specific endpoint of the Business Layer.
   */
  const onSubmit = async (formData) => {
    setSubmissionStatus({ status: "idle", message: null, data: null });

    const activeAction = selectedActionRef.current || configuredActions[0];

    if (!activeAction?.endpoint) {
      const errMessage = "No API action endpoint configured in the backend PAGE_ACTION table.";
      setSubmissionStatus({ status: "error", message: errMessage });
      if (onError) onError(new Error(errMessage));
      return;
    }

    try {
      // 1. Extract Read-Only Context from Display_Card widgets & Skeletons
      const readOnlyDisplayContext = widgets
        .filter((w) => {
          const t = (w?.widgetType || w?.type || "").toLowerCase();
          return t.includes("display") || t.includes("card") || t.includes("skeleton");
        })
        .reduce((acc, w) => {
          if (w?.props?.data && typeof w.props.data === "object") {
            return { ...acc, ...w.props.data };
          }
          return acc;
        }, {});

      // 2. Extract Read-Only field values explicitly defined in Input_Group schema
      const readOnlyFieldValues = widgets
        .filter((w) => {
          const t = (w?.widgetType || w?.type || "").toLowerCase();
          return t.includes("input") || t.includes("form");
        })
        .flatMap((w) => w?.props?.fields || [])
        .filter((f) => f?.readOnly || f?.isReadOnly)
        .reduce((acc, f) => {
          if (f?.name && f?.defaultValue !== undefined) {
            acc[f.name] = f.defaultValue;
          }
          return acc;
        }, {});

      // 3. Aggregate the COMPLETE DATASET:
      //    (Read-Only Context + User Inputs + Core Banking Routing Metadata)
      const completeAggregatedDataset = {
        // Read-only system data from backend
        ...readOnlyDisplayContext,
        // Search query context (e.g., sourceAccount, branchCode)
        ...(searchContext || {}),
        // Read-only schema defaults
        ...readOnlyFieldValues,
        // User entered interactive values
        ...formData,
        // Normalized Core Banking field mappings for Business Layer routing
        sourceAccount:
          searchContext?.sourceAccount ||
          searchContext?.accountNo ||
          readOnlyDisplayContext?.accountNo ||
          readOnlyDisplayContext?.accountNumber ||
          formData?.sourceAccount,
        destAccount:
          formData?.destAccount ||
          formData?.targetAccount ||
          formData?.destinationAccount,
        amount:
          formData?.amount !== undefined
            ? Number(formData.amount)
            : formData?.transferAmount !== undefined
            ? Number(formData.transferAmount)
            : undefined,
        currency:
          formData?.currency ||
          readOnlyFieldValues?.currency ||
          "BDT",
        // Business Layer Action Metadata (from PAGE_ACTION)
        actionId: activeAction.id,
        actionName: activeAction.label,
        actionType: activeAction.type,
        targetEndpoint: activeAction.endpoint,
        httpMethod: activeAction.method,
        menuId: selectedSubService?.menuId,
        menuCode: selectedSubService?.menuCode,
        timestamp: new Date().toISOString(),
        channel: "SDUI_CORE_GATEWAY",
      };

      console.info(
        `[SDUI Context-Aware Router] Transmitting aggregated dataset to Business Layer (${activeAction.endpoint}):`,
        completeAggregatedDataset
      );

      const actionMetadata = {
        endpoint: activeAction.endpoint,
        method: activeAction.method || "POST",
      };

      const result = await dispatchDynamicAction(actionMetadata, completeAggregatedDataset);

      if (result.success) {
        const successMsg =
          result.data?.message ||
          result.data?.ref ||
          `Action "${activeAction.label}" executed successfully through Core Banking Gateway.`;

        setSubmissionStatus({
          status: "success",
          message:
            typeof successMsg === "string"
              ? successMsg
              : "Transaction processed successfully.",
          data: {
            ...result.data,
            actionName: activeAction.label,
            endpoint: activeAction.endpoint,
            method: activeAction.method,
          },
        });

        if (onSuccess) onSuccess(result.data);
      } else {
        const errorMsg =
          result.error || `Unable to complete ${activeAction.label}. Please verify inputs.`;
        setSubmissionStatus({
          status: "error",
          message: errorMsg,
          data: result.data,
        });

        if (onError) onError(new Error(errorMsg));
      }
    } catch (err) {
      const errorMsg =
        err?.message || "An unexpected system error occurred during execution.";
      setSubmissionStatus({ status: "error", message: errorMsg });
      if (onError) onError(err);
    }
  };

  const handleResetForm = () => {
    methods.reset();
    setSubmissionStatus({ status: "idle", message: null, data: null });
  };

  const handleDismissAlert = () => {
    setSubmissionStatus({ status: "idle", message: null, data: null });
  };

  return (
    <div className="mx-auto w-full max-w-4xl rounded-3xl border border-slate-200/90 bg-white p-6 shadow-md transition-all sm:p-8 md:p-9">
      {/* ── Dynamic Page Header & Access Control Policy Bar ─────────────── */}
      <header className="mb-6 border-b border-slate-100 pb-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
          <div className="flex items-center space-x-2 text-xs font-bold uppercase tracking-wider text-indigo-600 font-mono">
            <span className="h-2 w-2 rounded-full bg-indigo-600 animate-pulse"></span>
            <span>Server-Driven UI (SDUI) Engine</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              <span>Strict Access Control</span>
            </span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-500">
              {widgets.length} Schema Widgets
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {pageTitle}
        </h1>

        {/* Strict Access Control Notice */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xl border border-slate-200 bg-slate-50/80 p-3 text-xs text-slate-600">
          <span className="text-sm shrink-0">🔒</span>
          <p className="leading-relaxed">
            <strong className="text-slate-800">Strict Access Control Active:</strong> System data fetched from the JSON response is rendered strictly as read-only. Only explicitly designated fields within the JSON schema allow user data entry.
          </p>
        </div>
      </header>

      {/* ── Dynamic Submission Feedback Alerts ──────────────────────────── */}
      {submissionStatus.status === "success" && (
        <TransactionReceiptCard
          data={submissionStatus.data}
          message={submissionStatus.message}
          onReset={handleResetForm}
          onDismiss={handleDismissAlert}
        />
      )}

      {submissionStatus.status === "error" && (
        <div
          role="alert"
          className="mb-6 flex items-start justify-between rounded-2xl border border-rose-200 bg-rose-50/90 p-4 text-sm text-rose-900 shadow-sm animate-fadeIn"
        >
          <div className="flex items-start">
            <svg
              className="mr-3 mt-0.5 h-5 w-5 shrink-0 text-rose-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <p className="font-bold text-rose-950">Submission Failed</p>
              <p className="mt-0.5 text-xs text-rose-800 break-words">
                {submissionStatus.message}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleDismissAlert}
            aria-label="Dismiss error"
            className="rounded-lg p-1 text-rose-400 hover:bg-rose-100 hover:text-rose-700 transition"
          >
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </button>
        </div>
      )}

      {/* ── Dynamic Form Rendering (Wrapped in FormProvider) ─────────────── */}
      <FormProvider {...methods}>
        <form
          onSubmit={methods.handleSubmit(onSubmit)}
          noValidate
          className="flex flex-col gap-6"
        >
          {(() => {
            const contentWidgets = widgets.filter((w) => {
              const type = (w?.widgetType || w?.type || "").toLowerCase();
              return !type.includes("action") && !type.includes("button");
            });

            if (contentWidgets.length === 0) {
              return (
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 text-center text-sm text-slate-500">
                  No form widgets configured in this UI blueprint.
                </div>
              );
            }

            return contentWidgets.map((widget, index) => {
              const widgetType = widget?.widgetType || widget?.type;
              const WidgetComponent = resolveWidget(widgetType);
              const key = widget?.id || `${widgetType || "widget"}_${index}`;

              if (!WidgetComponent) {
                return (
                  <UnknownWidgetFallback
                    key={key}
                    widgetType={widgetType}
                  />
                );
              }

              // Enrich DisplayCard data with searched identifier if present
              let enrichedProps = { ...(widget?.props || {}) };
              if (
                widgetType?.toLowerCase().includes("display_card") ||
                widgetType?.toLowerCase().includes("skeleton_card")
              ) {
                const searchVal =
                  searchContext?.sourceAccount ||
                  searchContext?.accountNo ||
                  searchContext?.searchValue ||
                  searchContext?.cardLast4 ||
                  searchContext?.facilityId;

                if (searchVal && enrichedProps.data && typeof enrichedProps.data === "object") {
                  enrichedProps = {
                    ...enrichedProps,
                    data: {
                      ...enrichedProps.data,
                      ...(enrichedProps.data.accountNo ? { accountNo: searchVal } : {}),
                      ...(enrichedProps.data.accountNumber ? { accountNumber: searchVal } : {}),
                    },
                  };
                }
              }

              return (
                <div key={key} className="w-full transition-opacity">
                  <WidgetComponent {...enrichedProps} />
                </div>
              );
            });
          })()}

          {/* ── Dynamic Action Buttons Configured via Backend PAGE_ACTION Table ── */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 pt-5">
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="font-medium text-slate-700">Business Layer Routing Active</span>
              <span>·</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[10px] text-slate-600">
                {configuredActions.length} Actions via PAGE_ACTION
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {configuredActions.map((action, idx) => {
                const isPrimary = action.variant === "primary" || idx === 0;
                const isEmerald = action.variant === "emerald" || idx === 1;

                return (
                  <button
                    key={action.id || idx}
                    type="button"
                    onClick={() => {
                      selectedActionRef.current = action;
                      methods.handleSubmit(onSubmit)();
                    }}
                    disabled={methods.formState.isSubmitting}
                    className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-semibold tracking-wide shadow-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed ${
                      isPrimary
                        ? "bg-indigo-600 text-white hover:bg-indigo-700 shadow-indigo-200"
                        : isEmerald
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-200"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200 shadow-slate-100"
                    }`}
                  >
                    {methods.formState.isSubmitting && selectedActionRef.current?.id === action.id ? (
                      <>
                        <svg className="h-4 w-4 animate-spin text-current" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Routing to {action.label}...</span>
                      </>
                    ) : (
                      <>
                        {isPrimary && (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                        )}
                        {isEmerald && (
                          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        )}
                        <span>{action.label}</span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
