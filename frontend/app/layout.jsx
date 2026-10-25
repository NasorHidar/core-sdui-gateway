import "./globals.css";

export const metadata = {
  title: "SDUI Forge | Core Banking Gateway",
  description: "Server-Driven UI Metadata Engine — Core Banking Ecosystem",
};

/**
 * RootLayout
 * ─────────────────────────────────────────────────────────────────────────────
 * Minimal root layout. All navigation chrome is handled by:
 *   - /login/page.jsx        — standalone full-screen login
 *   - /dashboard/layout.jsx  — sidebar + header + auth guard
 *
 * This keeps the root layout clean so /login doesn't inherit dashboard chrome.
 */
export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
