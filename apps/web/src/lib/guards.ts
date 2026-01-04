import { auth, type Session } from "@horizon/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

/**
 * Server-side guard for protected routes.
 * Redirects to login if not authenticated.
 */
export async function requireAuth(): Promise<Session> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  return session;
}

/**
 * Server-side guard for admin-only routes.
 * Redirects to login if not authenticated.
 * Redirects to /forbidden if authenticated but not an admin.
 */
export async function requireAdmin(): Promise<Session> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== "ADMIN") {
    redirect("/forbidden");
  }

  return session;
}

/**
 * Server-side guard for user-only routes.
 * Redirects to login if not authenticated.
 * Redirects to /admin if user is an admin (admins should use admin routes).
 */
export async function requireUser(): Promise<Session> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  return session;
}
