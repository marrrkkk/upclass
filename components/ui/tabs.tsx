"use client"

import * as React from "react"
import * as TabsPrimitive from "@radix-ui/react-tabs"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const tabsListVariants = cva("inline-flex items-center", {
  variants: {
    variant: {
      pill: "h-[var(--control-height-md)] w-fit justify-center rounded-[var(--radius-buttons)] bg-muted p-0.5 text-muted-foreground",
      line: "h-10 w-full justify-start gap-1 overflow-x-auto border-b border-hairline text-muted-foreground",
      solid: "h-[var(--control-height-md)] w-fit justify-center rounded-[var(--radius-buttons)] bg-muted p-0.5 text-muted-foreground",
    },
  },
  defaultVariants: { variant: "pill" },
})

const tabsTriggerVariants = cva(
  "focus-ring inline-flex cursor-pointer items-center justify-center gap-1.5 whitespace-nowrap type-small font-medium transition-[color,background-color,border-color,box-shadow] duration-[var(--duration-base)] ease-out-expo disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-3.5 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        pill: "h-[calc(100%-2px)] flex-1 rounded-[calc(var(--radius-buttons)-2px)] border border-transparent px-2.5 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground",
        line: "relative -mb-px h-10 shrink-0 border-b-2 border-transparent px-2.5 data-[state=active]:border-primary-strong data-[state=active]:text-primary-text hover:text-foreground",
        solid: "h-[calc(100%-2px)] rounded-[calc(var(--radius-buttons)-2px)] border border-transparent px-2.5 hover:text-foreground data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=active]:hover:text-primary-foreground",
      },
    },
    defaultVariants: { variant: "pill" },
  },
)

type TabsVariant = NonNullable<VariantProps<typeof tabsListVariants>["variant"]>
const TabsVariantContext = React.createContext<TabsVariant>("pill")

function Tabs({ className, variant = "pill", ...props }: React.ComponentProps<typeof TabsPrimitive.Root> & { variant?: TabsVariant }) {
  return <TabsVariantContext.Provider value={variant}><TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col gap-3", className)} {...props} /></TabsVariantContext.Provider>
}

function TabsList({ className, variant, ...props }: React.ComponentProps<typeof TabsPrimitive.List> & { variant?: TabsVariant }) {
  const contextVariant = React.useContext(TabsVariantContext)
  return <TabsPrimitive.List data-slot="tabs-list" className={cn(tabsListVariants({ variant: variant ?? contextVariant }), className)} {...props} />
}

function TabsTrigger({ className, variant, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger> & { variant?: TabsVariant }) {
  const contextVariant = React.useContext(TabsVariantContext)
  return <TabsPrimitive.Trigger data-slot="tabs-trigger" className={cn(tabsTriggerVariants({ variant: variant ?? contextVariant }), className)} {...props} />
}

function TabsContent({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content data-slot="tabs-content" className={cn("flex-1 outline-none data-[state=active]:motion-fade", className)} {...props} />
}

export { Tabs, TabsList, TabsTrigger, TabsContent, tabsListVariants, tabsTriggerVariants }
