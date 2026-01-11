import { auth } from "@horizon/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getProjectsByClient } from "@/actions/project";
import { getClientPendingQuestionnaires } from "@/actions/questionnaire/assignment";
import Dashboard from "./dashboard";

export default async function DashboardPage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role === "ADMIN") {
    redirect("/admin");
  }

  // Fetch data for the dashboard
  const [pendingQuestionnaires, projects] = await Promise.all([
    getClientPendingQuestionnaires(),
    getProjectsByClient(),
  ]);

  return (
    <Dashboard
      pendingQuestionnaires={pendingQuestionnaires}
      projects={projects}
      session={session}
    />
  );
}
