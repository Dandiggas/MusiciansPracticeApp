"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { MobileNav } from "./MobileNav";
import { cn } from "@/lib/utils";
import LogoutButton from "@/components/practice/LogoutButton";

export function Header() {
  const pathname = usePathname();

  const navigation = [
    { name: "The Shed", href: "/sessions" },
    { name: "Metronome", href: "/metronome" },
    { name: "Tuner", href: "/tuner" },
    { name: "Admin", href: "/admin" },
  ];

  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <header className="sticky top-0 z-40 h-14 border-b border-border/50 bg-background/80 backdrop-blur-xl">
      <div className="container flex h-14 max-w-screen-2xl items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/sessions" className="mr-8 flex items-center space-x-2">
            <span className="text-lg font-extrabold tracking-tight">
              The Shed
            </span>
          </Link>
          <nav className="flex items-center gap-6 text-sm font-medium">
            {navigation.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "transition-colors hover:text-foreground",
                  pathname === item.href
                    ? "text-foreground"
                    : "text-muted-foreground"
                )}
              >
                {item.name}
              </Link>
            ))}
          </nav>
        </div>

        <div className="flex md:hidden flex-1">
          <Link href="/sessions" className="flex items-center space-x-2">
            <span className="text-lg font-extrabold tracking-tight">
              The Shed
            </span>
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-end space-x-2">
          <nav className="flex items-center space-x-2">
            <LogoutButton
              label="Log Out"
              className="hidden h-9 rounded-lg border-border bg-secondary px-4 text-sm text-secondary-foreground hover:bg-secondary/80 md:inline-flex"
            />
            <ThemeToggle />
            <MobileNav />
          </nav>
        </div>
      </div>
    </header>
  );
}
