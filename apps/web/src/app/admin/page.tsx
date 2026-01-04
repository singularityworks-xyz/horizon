import { auth } from "@horizon/auth";
import { headers } from "next/headers";

export default async function AdminPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-medium text-muted-foreground text-sm">
            Total Users
          </h3>
          <p className="mt-2 font-bold text-3xl">--</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-medium text-muted-foreground text-sm">
            Active Sessions
          </h3>
          <p className="mt-2 font-bold text-3xl">--</p>
        </div>
        <div className="rounded-lg border bg-card p-6 shadow-sm">
          <h3 className="font-medium text-muted-foreground text-sm">
            System Status
          </h3>
          <p className="mt-2 font-bold text-3xl text-green-500">Online</p>
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <h2 className="mb-4 font-semibold text-lg">Current Admin</h2>
        <div className="space-y-2 text-sm">
          <p>
            <span className="font-medium">Name:</span> {session?.user.name}
          </p>
          <p>
            <span className="font-medium">Email:</span> {session?.user.email}
          </p>
          <p>
            <span className="font-medium">Role:</span>{" "}
            <span className="rounded bg-primary/10 px-2 py-0.5 text-primary">
              {session?.user.role}
            </span>
          </p>
        </div>
      </div>
    </div>
  );
}
