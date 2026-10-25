"use client";

/**
 * ErrorBoundary.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Enterprise-grade React Error Boundary for the SDUI Forge banking frontend.
 *
 * Problem this solves:
 *   The backend can serve malformed or structurally unexpected PAGE_UI_BLUEPRINT
 *   JSON (e.g., null widget type, missing required props, wrong data types).
 *   In plain JavaScript (no TypeScript), there is no compile-time safety net —
 *   runtime crashes propagate up the React tree and blank the entire banking page.
 *
 * Design decisions:
 *   1. CLASS COMPONENT: React Error Boundaries MUST be class components. The
 *      getDerivedStateFromError + componentDidCatch lifecycle pair has no functional
 *      hook equivalent. This is a React architectural constraint, not a preference.
 *
 *   2. GRANULAR WRAPPING: One ErrorBoundary per widget (rendered inside
 *      SduiRenderer.renderNode) isolates failures. A broken "Transfer Summary"
 *      widget does not crash "Account Balance" or "Transaction History".
 *
 *   3. LOCALIZED FALLBACK: Each boundary receives the widget's `widgetId` and
 *      `widgetType` as props. The fallback UI displays a context-aware
 *      "Widget unavailable" message rather than a generic "Something went wrong".
 *
 *   4. STRUCTURED ERROR LOGGING: componentDidCatch sends the error to a
 *      configurable `onError` callback (defaults to console.error in dev, can be
 *      wired to Sentry, Datadog, or a custom audit endpoint in production).
 *
 *   5. RECOVERABLE STATE: A "Retry" button resets the error boundary state,
 *      allowing the user to attempt re-render without a full page reload.
 *      Critical for banking workflows (e.g., mid-transfer form crash).
 *
 *   6. NO EXTERNAL DEPENDENCIES: Pure React + vanilla CSS. No library imports
 *      that could introduce version conflicts with the Next.js App Router.
 */

import React from "react";

// ─────────────────────────────────────────────────────────────────────────────
// WIDGET-LEVEL ERROR BOUNDARY
// Wraps a single SDUI widget node. One per node in the SduiRenderer tree.
// ─────────────────────────────────────────────────────────────────────────────

export class WidgetErrorBoundary extends React.Component {
  /**
   * @param {object} props
   * @param {string}   props.widgetId    - The backend-assigned widget ID (e.g., "acct-summary-001")
   * @param {string}   props.widgetType  - The widget type string (e.g., "ACCOUNT_SUMMARY_CARD")
   * @param {Function} [props.onError]   - Optional: custom error reporter (Sentry, Datadog, etc.)
   * @param {React.ReactNode} props.children
   */
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: null,
      errorCode: null,
    };
    this.handleRetry = this.handleRetry.bind(this);
  }

  /**
   * Called synchronously during render when a descendant throws.
   * Updates state to trigger the fallback UI on the next render cycle.
   * Must be a static method — receives the thrown error, returns state update.
   *
   * @param {Error} error
   * @returns {{ hasError: boolean, errorMessage: string, errorCode: string }}
   */
  static getDerivedStateFromError(error) {
    // Classify the error for the fallback UI (keeps user messages safe — no raw
    // stack traces shown to bank customers, but category is surfaced for UX).
    let errorCode = "WIDGET_RENDER_ERROR";

    if (error instanceof TypeError) {
      // Most common: missing JSON key (e.g., `undefined.map(...)`)
      errorCode = "MALFORMED_WIDGET_DATA";
    } else if (error instanceof SyntaxError) {
      // JSON.parse failure on a nested blueprint field
      errorCode = "INVALID_JSON_PAYLOAD";
    } else if (error instanceof RangeError) {
      // Infinite recursion in nested children — guard against circular blueprints
      errorCode = "WIDGET_OVERFLOW";
    }

    return {
      hasError: true,
      errorMessage: error.message,
      errorCode,
    };
  }

  /**
   * Called after the error boundary commits the fallback UI.
   * Use this for side-effects: logging, alerting, metrics.
   *
   * @param {Error}  error      - The thrown error object
   * @param {object} errorInfo  - React's componentStack trace
   */
  componentDidCatch(error, errorInfo) {
    const { widgetId, widgetType, onError } = this.props;
    const { errorCode } = this.state;

    const errorContext = {
      widgetId,
      widgetType,
      errorCode,
      message: error.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    if (typeof onError === "function") {
      // Production: send to Sentry / Datadog / custom audit endpoint
      onError(errorContext);
    } else {
      // Development: structured log for debugging
      console.error("[SDUI ErrorBoundary] Widget render failure:", errorContext);
    }
  }

  /**
   * Resets the error state to allow a re-render attempt.
   * Equivalent to "refresh this widget" without a full page reload.
   */
  handleRetry() {
    this.setState({
      hasError: false,
      errorMessage: null,
      errorCode: null,
    });
  }

  render() {
    if (!this.state.hasError) {
      // Happy path: render children transparently
      return this.props.children;
    }

    const { widgetId, widgetType } = this.props;
    const { errorCode } = this.state;

    // Localized fallback UI — Banking safe: no stack traces, no raw error messages
    return (
      <WidgetFallback
        widgetId={widgetId}
        widgetType={widgetType}
        errorCode={errorCode}
        onRetry={this.handleRetry}
      />
    );
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PAGE-LEVEL ERROR BOUNDARY
// Wraps the entire SduiRenderer. Catches catastrophic failures (e.g., the
// blueprint array itself is malformed and renderNode crashes on the first node).
// ─────────────────────────────────────────────────────────────────────────────

export class PageErrorBoundary extends React.Component {
  /**
   * @param {object} props
   * @param {string}   props.pageId     - The SDUI page ID being rendered
   * @param {string}   props.pageTitle  - Human-readable page title (for fallback)
   * @param {Function} [props.onError]  - Custom error reporter
   * @param {Function} [props.onReload] - Custom reload handler (defaults to window.location.reload)
   * @param {React.ReactNode} props.children
   */
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorCode: null,
    };
    this.handleReload = this.handleReload.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, errorCode: "PAGE_RENDER_FAILURE" };
  }

  componentDidCatch(error, errorInfo) {
    const { pageId, pageTitle, onError } = this.props;
    const errorContext = {
      level: "PAGE",
      pageId,
      pageTitle,
      message: error.message,
      componentStack: errorInfo.componentStack,
      timestamp: new Date().toISOString(),
    };

    if (typeof onError === "function") {
      onError(errorContext);
    } else {
      console.error("[SDUI PageErrorBoundary] Page render failure:", errorContext);
    }
  }

  handleReload() {
    const { onReload } = this.props;
    if (typeof onReload === "function") {
      onReload();
    } else {
      // Reset boundary state first, then reload
      this.setState({ hasError: false, errorCode: null }, () => {
        window.location.reload();
      });
    }
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const { pageTitle } = this.props;

    return <PageFallback pageTitle={pageTitle} onReload={this.handleReload} />;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FALLBACK UI COMPONENTS
// Presentational-only, no state. Inline styles ensure they render even if
// the CSS module/Tailwind pipeline itself has a loading error.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Widget-level fallback: "Widget unavailable"
 * Displayed for individual failed nodes. Does not disrupt the rest of the page.
 *
 * @param {{ widgetId: string, widgetType: string, errorCode: string, onRetry: Function }} props
 */
function WidgetFallback({ widgetId, widgetType, errorCode, onRetry }) {
  return (
    <div
      role="alert"
      aria-live="polite"
      data-widget-id={widgetId}
      data-error-code={errorCode}
      style={styles.widgetFallbackContainer}
    >
      <div style={styles.widgetFallbackHeader}>
        <span style={styles.warningIcon} aria-hidden="true">⚠</span>
        <span style={styles.widgetFallbackTitle}>Widget unavailable</span>
      </div>

      <p style={styles.widgetFallbackBody}>
        The{" "}
        <strong>
          {widgetType
            ? widgetType.replace(/_/g, " ").toLowerCase()
            : "requested component"}
        </strong>{" "}
        could not be displayed. Our team has been notified.
      </p>

      {widgetId && (
        <p style={styles.widgetFallbackMeta}>
          Reference: <code style={styles.codeChip}>{widgetId}</code>
        </p>
      )}

      <button
        onClick={onRetry}
        style={styles.retryButton}
        aria-label={`Retry loading ${widgetType || "widget"}`}
      >
        Try again
      </button>
    </div>
  );
}

/**
 * Page-level fallback: Full-page error screen.
 * Displayed only when the entire SduiRenderer crashes — a last resort.
 *
 * @param {{ pageTitle: string, onReload: Function }} props
 */
function PageFallback({ pageTitle, onReload }) {
  return (
    <div role="alert" aria-live="assertive" style={styles.pageFallbackContainer}>
      <div style={styles.pageFallbackCard}>
        <div style={styles.pageFallbackIcon} aria-hidden="true">🔧</div>

        <h1 style={styles.pageFallbackHeading}>
          Page temporarily unavailable
        </h1>

        <p style={styles.pageFallbackBody}>
          We were unable to load{" "}
          <strong>{pageTitle || "this banking page"}</strong>.
          This issue has been logged automatically. Please try refreshing, or
          contact your system administrator if the problem persists.
        </p>

        <div style={styles.pageFallbackActions}>
          <button
            onClick={onReload}
            style={styles.primaryButton}
            aria-label="Reload this page"
          >
            Refresh page
          </button>

          <a href="/" style={styles.secondaryLink} aria-label="Return to home">
            Return to home
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// INLINE STYLES
// Defined as a plain object so they are always available — not relying on
// CSS modules or Tailwind classes that might themselves fail to load.
// Colors follow WCAG AA contrast ratios (4.5:1+) for accessibility compliance.
// ─────────────────────────────────────────────────────────────────────────────

const styles = {
  // ── Widget fallback ──
  widgetFallbackContainer: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    padding: "16px 20px",
    borderRadius: "8px",
    border: "1px solid #FCD34D",          // Amber-300
    backgroundColor: "#FFFBEB",           // Amber-50
    color: "#78350F",                     // Amber-900 — WCAG AA on amber-50
    fontFamily: "inherit",
    fontSize: "0.875rem",
  },
  widgetFallbackHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  warningIcon: {
    fontSize: "1.1rem",
    color: "#D97706",                     // Amber-600
    flexShrink: 0,
  },
  widgetFallbackTitle: {
    fontWeight: 600,
    fontSize: "0.9375rem",
    color: "#92400E",                     // Amber-800
  },
  widgetFallbackBody: {
    margin: 0,
    lineHeight: 1.5,
    color: "#78350F",
  },
  widgetFallbackMeta: {
    margin: 0,
    fontSize: "0.75rem",
    color: "#92400E",
  },
  codeChip: {
    display: "inline-block",
    padding: "2px 6px",
    backgroundColor: "#FDE68A",           // Amber-200
    borderRadius: "4px",
    fontFamily: "monospace",
    fontSize: "0.75rem",
  },
  retryButton: {
    alignSelf: "flex-start",
    padding: "6px 14px",
    fontSize: "0.8125rem",
    fontWeight: 500,
    color: "#78350F",
    backgroundColor: "#FDE68A",           // Amber-200
    border: "1px solid #F59E0B",
    borderRadius: "6px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },

  // ── Page fallback ──
  pageFallbackContainer: {
    minHeight: "60vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "32px 16px",
    backgroundColor: "#F8FAFC",
  },
  pageFallbackCard: {
    maxWidth: "480px",
    width: "100%",
    textAlign: "center",
    padding: "48px 40px",
    backgroundColor: "#FFFFFF",
    borderRadius: "16px",
    boxShadow: "0 4px 24px rgba(0,0,0,0.08), 0 1px 4px rgba(0,0,0,0.04)",
    border: "1px solid #E2E8F0",
  },
  pageFallbackIcon: {
    fontSize: "3rem",
    marginBottom: "16px",
  },
  pageFallbackHeading: {
    margin: "0 0 16px 0",
    fontSize: "1.375rem",
    fontWeight: 700,
    color: "#0F172A",                     // Slate-900
    lineHeight: 1.3,
  },
  pageFallbackBody: {
    margin: "0 0 32px 0",
    fontSize: "0.9375rem",
    color: "#475569",                     // Slate-600
    lineHeight: 1.6,
  },
  pageFallbackActions: {
    display: "flex",
    flexDirection: "column",
    gap: "12px",
    alignItems: "center",
  },
  primaryButton: {
    width: "100%",
    padding: "12px 24px",
    fontSize: "0.9375rem",
    fontWeight: 600,
    color: "#FFFFFF",
    backgroundColor: "#1E40AF",           // Blue-800 — banking primary
    border: "none",
    borderRadius: "8px",
    cursor: "pointer",
    transition: "background-color 0.15s ease",
  },
  secondaryLink: {
    display: "inline-block",
    fontSize: "0.875rem",
    fontWeight: 500,
    color: "#3B82F6",                     // Blue-500
    textDecoration: "underline",
    textUnderlineOffset: "3px",
  },
};
