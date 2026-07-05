import React from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { type IconProps } from "@phosphor-icons/react";

interface StatsCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon: React.ComponentType<IconProps>;
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

export function StatsCard({ title, value, description, icon: Icon, trend }: StatsCardProps) {
  return (
    <Card className="border-border/60 bg-card shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
        </div>
        <div className="rounded-full bg-muted p-2 text-muted-foreground">
          <Icon size={20} weight="regular" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight text-foreground">{value}</div>
        {description && (
          <p className="mt-2 text-sm text-muted-foreground">{description}</p>
        )}
        {trend && (
          <p
            className={`mt-2 text-xs font-semibold ${
              trend.isPositive ? "text-success" : "text-destructive"
            }`}
          >
            {trend.isPositive ? "+" : ""}
            {trend.value}% from last week
          </p>
        )}
      </CardContent>
    </Card>
  );
}
