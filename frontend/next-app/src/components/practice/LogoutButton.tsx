"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { SignOut } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  className?: string;
  label?: string;
  showIcon?: boolean;
  variant?: "default" | "destructive" | "outline" | "secondary" | "ghost" | "link";
};

const LogoutButton: React.FC<LogoutButtonProps> = ({
  className,
  label = "Logout",
  showIcon = true,
  variant = "outline",
}) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleLogout = async () => {
    setIsPending(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Error logging out:", error);
    } finally {
      router.push("/login");
      router.refresh();
      setIsPending(false);
    }
  };

  return (
    <Button
      onClick={handleLogout}
      variant={variant}
      className={cn(className)}
      disabled={isPending}
    >
      {showIcon ? <SignOut size={20} weight="regular" className="mr-2" /> : null}
      {isPending ? "Logging out..." : label}
    </Button>
  );
};

export default LogoutButton;
