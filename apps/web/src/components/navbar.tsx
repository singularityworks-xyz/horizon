"use client";

import { LogOut } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { authClient } from "@/lib/auth-client";
import { ModeToggle } from "./mode-toggle";
import { Button } from "./ui/button";
import { Skeleton } from "./ui/skeleton";

export default function Navbar() {
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();

  return (
    <nav className="sticky top-0 z-50 w-full border-border/50 border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo - Always visible */}
        <Link className="group flex items-center gap-3" href="/">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-card shadow-lg shadow-primary/20 transition-all duration-300 group-hover:scale-105 group-hover:border-primary/80 group-hover:shadow-primary/40">
            <span className="font-bold text-primary text-xl transition-transform duration-300 group-hover:scale-110">
              H
            </span>
          </div>
          <span className="hidden font-semibold text-foreground text-lg transition-colors duration-300 group-hover:text-primary md:inline-block">
            HORIZON
          </span>
        </Link>

        {/* Right Section - Auth State Aware */}
        <div className="flex items-center gap-4">
          <ModeToggle />

          {isPending && <Skeleton className="h-10 w-24 rounded-lg" />}

          {!isPending && session && (
            // Logged in state - Refined design matching admin-header
            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end text-right">
                <span className="font-medium text-foreground text-sm leading-tight">
                  {session.user.name}
                </span>
                <span className="font-medium text-muted-foreground text-xs">
                  {(session.user as { role?: string }).role || "User"}
                </span>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      className="relative h-10 w-10 overflow-hidden rounded-full p-0 transition-all duration-300 hover:ring-2 hover:ring-primary/50 hover:ring-offset-2 hover:ring-offset-background"
                      variant="ghost"
                    >
                      <div className="flex h-full w-full items-center justify-center bg-primary font-semibold text-primary-foreground">
                        {session.user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    </Button>
                  }
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground transition-all duration-300 hover:bg-primary/90">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="w-56 animate-pop-in"
                >
                  <DropdownMenuGroup>
                    <DropdownMenuLabel className="font-normal">
                      <div className="flex flex-col space-y-1">
                        <p className="font-medium text-sm leading-none">
                          {session.user.name}
                        </p>
                        <p className="text-muted-foreground text-xs leading-none">
                          {session.user.email}
                        </p>
                      </div>
                    </DropdownMenuLabel>
                  </DropdownMenuGroup>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem
                      className="cursor-pointer text-destructive transition-all duration-200 hover:bg-destructive/10 focus:text-destructive"
                      onClick={() => {
                        authClient.signOut({
                          fetchOptions: {
                            onSuccess: () => {
                              router.push("/");
                            },
                          },
                        });
                      }}
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Log out</span>
                    </DropdownMenuItem>
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {!(isPending || session) && (
            // Not logged in state
            <Link href="/login">
              <Button
                className="transition-all duration-300 hover:border-primary hover:bg-primary/10 hover:text-primary"
                variant="outline"
              >
                Sign In
              </Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
