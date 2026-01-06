"use client";

import { ArrowRight, Shield, Sparkles, Zap } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Navbar from "@/components/navbar";
import { authClient } from "@/lib/auth-client";

export default function LandingPage() {
  const router = useRouter();
  const { data: session } = authClient.useSession();

  const handleDashboardClick = () => {
    if (session?.user) {
      // Redirect based on role
      const userRole = (session.user as { role?: string }).role;
      if (userRole === "ADMIN") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } else {
      // Redirect to login if not logged in
      router.push("/login");
    }
  };

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
        {/* Hero Section */}
        <div className="container relative mx-auto px-4 py-20">
          <div className="absolute top-10 right-20 h-72 w-72 animate-fade-in rounded-full bg-primary/10 blur-3xl" />
          <div className="animation-delay-1000 absolute bottom-20 left-10 h-96 w-96 animate-fade-in rounded-full bg-secondary/10 blur-3xl" />

          <div className="relative z-10 mx-auto max-w-4xl text-center">
            {/* Logo/Brand */}
            <div className="mb-8 flex justify-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-primary bg-background shadow-lg shadow-primary/20">
                <span className="font-bold text-4xl text-primary">H</span>
              </div>
            </div>

            {/* Main Heading */}
            <h1 className="mb-6 bg-gradient-to-r from-primary via-secondary to-primary bg-clip-text font-bold text-6xl text-transparent md:text-7xl">
              Welcome to Horizon
            </h1>

            <p className="mb-12 text-muted-foreground text-xl leading-relaxed md:text-2xl">
              Transform your workflow with our powerful platform.
              <br />
              Streamlined project management for modern teams.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
              <button
                className="group inline-flex items-center gap-2 rounded-xl bg-primary px-8 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/30 transition-all duration-300 hover:scale-105 hover:shadow-primary/40 hover:shadow-xl"
                onClick={handleDashboardClick}
                type="button"
              >
                Go to Dashboard
                <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
              </button>
              <Link
                className="inline-flex items-center gap-2 rounded-xl border-2 border-border bg-background/50 px-8 py-4 font-semibold transition-all duration-300 hover:border-primary hover:bg-primary/5"
                href="/login"
              >
                Sign In
              </Link>
            </div>
          </div>

          {/* Features Grid */}
          <div className="relative z-10 mx-auto mt-32 grid max-w-5xl gap-6 md:grid-cols-3">
            <div className="group rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/5">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-primary/20">
                <Sparkles className="h-7 w-7 text-primary" />
              </div>
              <h3 className="mb-2 font-semibold text-xl">Intuitive Design</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Beautiful, modern interface that makes project management
                effortless
              </p>
            </div>

            <div className="group rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all duration-300 hover:border-secondary/50 hover:shadow-lg hover:shadow-secondary/5">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-secondary/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-secondary/20">
                <Shield className="h-7 w-7 text-secondary" />
              </div>
              <h3 className="mb-2 font-semibold text-xl">Secure & Reliable</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Enterprise-grade security to keep your data safe and protected
              </p>
            </div>

            <div className="group rounded-2xl border border-border bg-card/50 p-8 backdrop-blur transition-all duration-300 hover:border-accent/50 hover:shadow-accent/5 hover:shadow-lg">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-xl bg-accent/10 transition-all duration-300 group-hover:scale-110 group-hover:bg-accent/20">
                <Zap className="h-7 w-7 text-accent" />
              </div>
              <h3 className="mb-2 font-semibold text-xl">Lightning Fast</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">
                Optimized performance for seamless collaboration
              </p>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
