"use client"

import { Search } from "lucide-react"

import { cn } from "@/lib/utils"

type ClassesSearchControlsProps = {
  activeTab: "teaching" | "enrolled"
  searchQuery: string
  onTabChange: (tab: "teaching" | "enrolled") => void
  onSearchChange: (value: string) => void
}

export function ClassesSearchControls({
  activeTab,
  searchQuery,
  onTabChange,
  onSearchChange,
}: ClassesSearchControlsProps) {
  return (
    <div className="flex flex-row gap-4 justify-start items-center">
      <div className="inline-flex p-1 bg-muted/40 rounded-xl border">
        <button
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
            activeTab === "teaching"
              ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
          onClick={() => onTabChange("teaching")}
        >
          Teaching
        </button>
        <button
          className={cn(
            "px-6 py-2 rounded-lg text-sm font-medium transition-all duration-300 ease-in-out",
            activeTab === "enrolled"
              ? "bg-white text-primary shadow-sm ring-1 ring-black/5"
              : "text-muted-foreground hover:text-foreground hover:bg-muted/50",
          )}
          onClick={() => onTabChange("enrolled")}
        >
          Enrolled
        </button>
      </div>

      <div className="relative w-full sm:w-72">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-muted-foreground" />
        </div>
        <input
          type="text"
          placeholder="Search classes..."
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="block w-full rounded-xl border-0 py-2.5 pl-10 text-sm ring-1 ring-inset ring-gray-200 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-primary/20 bg-muted/20 transition-all hover:bg-muted/30 focus:bg-white"
        />
      </div>
    </div>
  )
}
