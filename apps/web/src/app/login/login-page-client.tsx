"use client";

import Link from "next/link";
import { useState } from "react";
import SignInForm from "@/components/sign-in-form";
import SignUpForm from "@/components/sign-up-form";

export default function LoginPageClient() {
  const [showSignIn, setShowSignIn] = useState(true);

  return (
    <div className="flex min-h-screen">
      {/* Left Side - Branding */}
      <div className="relative hidden w-1/2 overflow-hidden bg-gradient-to-br from-primary via-primary/90 to-secondary lg:block">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRjMC0yLjIxIDEuNzktNCA0LTRzNCAxLjc5IDQgNG0wIDBoLThrVjQ2aDh6Ii8+PC9nPjwvZz48L3N2Zz4=')] opacity-10" />

        <div className="relative z-10 flex h-full flex-col justify-between p-12">
          <Link className="flex items-center gap-3" href="/">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-white bg-white/10 backdrop-blur-sm">
              <span className="font-bold text-2xl text-white">H</span>
            </div>
            <span className="font-bold text-2xl text-white">HORIZON</span>
          </Link>

          <div className="space-y-6">
            <h2 className="font-bold text-5xl text-white">
              Transform Your
              <br />
              Workflow Today
            </h2>
            <p className="text-lg text-white/90 leading-relaxed">
              Join teams worldwide who trust Horizon for their
              <br />
              project management needs.
            </p>
          </div>

          <div className="flex items-center gap-2 text-sm text-white/70">
            <div className="h-2 w-2 rounded-full bg-white/50" />
            <span>Trusted by 10,000+ users globally</span>
          </div>
        </div>
      </div>

      {/*  Right Side - Auth Form */}
      <div className="flex w-full flex-1 items-center justify-center bg-background px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          {/* Logo for mobile */}
          <div className="mb-8 flex justify-center lg:hidden">
            <Link className="flex items-center gap-3" href="/">
              <div className="flex h-12 w-12 items-center justify-center rounded-full border-2 border-primary bg-primary/10">
                <span className="font-bold text-2xl text-primary">H</span>
              </div>
              <span className="font-bold text-2xl">HORIZON</span>
            </Link>
          </div>

          {showSignIn ? (
            <SignInForm onSwitchToSignUp={() => setShowSignIn(false)} />
          ) : (
            <SignUpForm onSwitchToSignIn={() => setShowSignIn(true)} />
          )}
        </div>
      </div>
    </div>
  );
}
