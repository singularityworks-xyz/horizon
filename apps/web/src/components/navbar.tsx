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
    <nav className="sticky top-0 z-50 w-full border-border border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-16 items-center justify-between px-6">
        {/* Logo - Always visible */}
        <Link className="flex items-center gap-2" href="/">
          <div className="flex h-10 w-10 items-center justify-center rounded-full border-2 border-primary bg-background shadow-md shadow-primary/20">
            <span className="font-bold text-2xl text-primary">H</span>
          </div>
          <span className="hidden font-semibold text-xl md:inline-block">
            HORIZON
          </span>
        </Link>

        {/* Right Section - Auth State Aware */}
        <div className="flex items-center gap-4">
          <ModeToggle />

          {isPending && <Skeleton className="h-10 w-24" />}

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
                      className="relative h-10 w-10 overflow-hidden rounded-full p-0"
                      variant="ghost"
                    >
                      <div className="flex h-full w-full items-center justify-center bg-primary font-semibold text-primary-foreground">
                        {session.user.name?.charAt(0).toUpperCase() || "U"}
                      </div>
                    </Button>
                  }
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary font-semibold text-primary-foreground">
                    {session.user.name?.charAt(0).toUpperCase() || "U"}
                  </div>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
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
                      className="cursor-pointer text-destructive focus:text-destructive"
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
              <Button variant="outline">Sign In</Button>
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
