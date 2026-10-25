import { redirect } from "next/navigation";

/**
 * Root Landing Page
 * ─────────────────────────────────────────────────────────────────────────────
 * Redirects visitors to the login page. Authenticated users are then
 * redirected to /dashboard by the login page itself.
 */
export default function RootPage() {
  redirect("/login");
}
