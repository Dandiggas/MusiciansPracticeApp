"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { List, X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import LogoutButton from "@/components/practice/LogoutButton";

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const navigation = [
    { name: "The Shed", href: "/sessions" },
    { name: "Metronome", href: "/metronome" },
    { name: "Tuner", href: "/tuner" },
    { name: "Admin", href: "/admin" },
  ];

  // Don't show on login/register pages
  if (pathname === "/login" || pathname === "/register") {
    return null;
  }

  return (
    <div className="md:hidden">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Toggle menu"
      >
        {isOpen ? <X size={20} weight="regular" /> : <List size={20} weight="regular" />}
      </Button>

      {/* Mobile Menu Overlay */}
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-background/80 backdrop-blur-xl dark:bg-background/70"
            onClick={() => setIsOpen(false)}
          />
          <nav className="fixed top-14 left-0 right-0 z-50 bg-background border-b border-border p-4">
            <div className="flex flex-col space-y-3">
              {navigation.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsOpen(false)}
                  className={cn(
                    "px-4 py-2 rounded-md transition-colors hover:bg-accent",
                    pathname === item.href
                      ? "bg-accent text-accent-foreground font-medium"
                      : "text-muted-foreground"
                  )}
                >
                  {item.name}
                </Link>
              ))}
              <LogoutButton
                label="Log Out"
                className="mt-2 h-11 w-full justify-center rounded-xl border-slate-300 bg-white text-slate-800 hover:bg-slate-50"
              />
            </div>
          </nav>
        </>
      )}
    </div>
  );
}
