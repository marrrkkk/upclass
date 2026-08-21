"use client"

import { ArrowUpDown, Search, X } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

type ClassesSearchControlsProps = {
  searchQuery: string
  /** Result count; `undefined` hides the count while the grid is streaming. */
  resultCount?: number
  sortOrder: "newest" | "oldest"
  onSearchChange: (value: string) => void
  onSortChange: (order: "newest" | "oldest") => void
  onReset: () => void
}

export function ClassesSearchControls({
  searchQuery,
  resultCount,
  sortOrder,
  onSearchChange,
  onSortChange,
  onReset,
}: ClassesSearchControlsProps) {
  const hasChanged = Boolean(searchQuery.trim()) || sortOrder !== "newest"

  return (
    <section
      role="search"
      aria-label="Class filters"
      className="flex flex-col gap-3 rounded-xl border border-hairline/80 bg-card/80 p-2 sm:p-2.5 shadow-2xs backdrop-blur-xs lg:flex-row lg:items-center"
    >
      <div className="relative w-full lg:max-w-md">
        <label htmlFor="classes-search" className="sr-only">
          Search classes
        </label>
        <Search
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground/70"
          aria-hidden="true"
        />
        <Input
          id="classes-search"
          type="search"
          placeholder="Search by class, subject, or teacher…"
          value={searchQuery}
          onChange={(event) => onSearchChange(event.target.value)}
          className="h-10 border-0 bg-surface/50 pl-9 pr-10 text-[13.5px] focus-visible:bg-surface focus-visible:ring-2 focus-visible:ring-primary/20 rounded-lg shadow-2xs"
        />
        {searchQuery ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            className="absolute right-2 top-1/2 -translate-y-1/2 size-6 rounded-md text-muted-foreground hover:text-foreground"
            aria-label="Clear search"
            onClick={() => onSearchChange("")}
          >
            <X className="size-3.5" />
          </Button>
        ) : null}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2 lg:ml-auto lg:flex-nowrap">
        {/* Visually hidden for screen readers and tests */}
        {resultCount != null ? (
          <span className="sr-only" aria-live="polite">
            {resultCount} {resultCount === 1 ? "class" : "classes"}
          </span>
        ) : null}

        {hasChanged ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={onReset}
            className="h-10 rounded-lg px-3 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            Reset
          </Button>
        ) : null}

        <Select
          value={sortOrder}
          onValueChange={(value) => onSortChange(value as "newest" | "oldest")}
        >
          <SelectTrigger
            aria-label="Sort classes"
            className="h-10 w-[9.5rem] rounded-lg border border-hairline/70 bg-surface/50 text-xs font-semibold shadow-2xs hover:bg-surface focus-visible:ring-primary/20"
          >
            <ArrowUpDown aria-hidden="true" className="size-3.5 text-muted-foreground" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent align="end" className="rounded-lg">
            <SelectItem value="newest" className="text-xs font-medium">
              Newest first
            </SelectItem>
            <SelectItem value="oldest" className="text-xs font-medium">
              Oldest first
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
    </section>
  )
}
