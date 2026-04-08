import * as React from "react"

import { cn } from "@/lib/utils"

/**
 * Double-bezel card architecture (Doppelrand).
 * Outer shell provides the tray feel — subtle bg, hairline border, padding.
 * Inner core (CardContent etc.) sits inside with its own distinct surface.
 */
function Card({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card"
      className={cn(
        // Outer shell — the "tray"
        "rounded-[2rem] bg-black/[0.03] p-1.5 ring-1 ring-black/[0.04]",
        "dark:bg-white/[0.03] dark:ring-white/[0.06]",
        className
      )}
      {...props}
    >
      {/* Inner core renders via children — CardInner wraps the content surface */}
    </div>
  )
}

/**
 * Inner surface of the double-bezel card.
 * Use this as the direct child of Card to get the nested architecture.
 */
function CardInner({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-inner"
      className={cn(
        // Inner core — distinct surface with its own highlight
        "rounded-[calc(2rem-0.375rem)] bg-card text-card-foreground flex flex-col gap-6 py-6",
        "shadow-[inset_0_1px_1px_rgba(255,255,255,0.08)]",
        "dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.06)]",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-1.5 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  CardInner,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
