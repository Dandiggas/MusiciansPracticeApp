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
    <Card className="border-white/70 bg-white/86 shadow-[0_20px_70px_-55px_rgba(15,23,42,0.45)] backdrop-blur">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            {title}
          </p>
        </div>
        <div className="rounded-full bg-slate-100 p-2 text-slate-700">
          <Icon size={20} weight="regular" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-black tracking-tight text-slate-950">{value}</div>
        {description && (
          <p className="mt-2 text-sm text-slate-600">{description}</p>
        )}
        {trend && (
          <p
            className={`mt-2 text-xs font-semibold ${
              trend.isPositive
                ? "text-green-600 dark:text-green-400"
                : "text-red-600 dark:text-red-400"
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
