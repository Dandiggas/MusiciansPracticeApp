"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
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
  const [hasToken, setHasToken] = useState(false);

  useEffect(() => {
    setHasToken(Boolean(localStorage.getItem("token")));
  }, []);

  const handleLogout = async () => {
    const token = localStorage.getItem("token");
    const apiBaseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

    if (token) {
      try {
        await axios.post(`${apiBaseUrl}/logout/`, null, {
          headers: { Authorization: `Token ${token}` },
        });
      } catch (error) {
        console.error("Error logging out:", error);
      } finally {
        localStorage.removeItem("token");
        setHasToken(false);
        router.push("/login");
        router.refresh();
      }
    }
  };

  if (!hasToken) {
    return null;
  }

  return (
    <Button onClick={handleLogout} variant={variant} className={cn(className)}>
      {showIcon ? <LogOut className="mr-2 h-4 w-4" /> : null}
      {label}
    </Button>
  );
};

export default LogoutButton;
