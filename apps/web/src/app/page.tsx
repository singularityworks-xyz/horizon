import { auth } from "@horizon/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import LandingPage from "./landing-page";

export default async function Home() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (session?.user) {
    if (session.user.role === "ADMIN") {
      redirect("/admin");
    } else {
      redirect("/dashboard");
    }
  }

  return <LandingPage />;
}
