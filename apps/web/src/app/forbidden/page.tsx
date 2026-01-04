import Link from "next/link";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4">
      <div className="text-center">
        <h1 className="font-bold text-6xl text-destructive">403</h1>
        <h2 className="mt-4 font-semibold text-2xl">Access Forbidden</h2>
        <p className="mt-2 text-muted-foreground">
          You don't have permission to access this page.
        </p>
        <div className="mt-8 flex justify-center gap-4">
          <Link
            className="rounded-md bg-primary px-4 py-2 font-medium text-primary-foreground text-sm transition-colors hover:bg-primary/90"
            href="/"
          >
            Go Home
          </Link>
          <Link
            className="rounded-md border border-input bg-background px-4 py-2 font-medium text-sm transition-colors hover:bg-accent hover:text-accent-foreground"
            href="/dashboard"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
