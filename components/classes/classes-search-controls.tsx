"use client"

import { Search } from "lucide-react"

import { CreateClassButton } from "@/components/classes/create-class-button"
import { JoinClassButton } from "@/components/classes/join-class-button"

type ClassesSearchControlsProps = {
  userRole: "teacher" | "student" | null
  isAuthenticated: boolean
  searchQuery: string
  onSearchChange: (value: string) => void
}

export function ClassesSearchControls({
  userRole,
  isAuthenticated,
  searchQuery,
  onSearchChange,
}: ClassesSearchControlsProps) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="relative w-full sm:max-w-sm">
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

      {isAuthenticated ? (
        <div className="flex justify-start sm:justify-end">
          {userRole === "teacher" ? <CreateClassButton /> : null}
          {userRole === "student" ? <JoinClassButton /> : null}
        </div>
      ) : null}
    </div>
  )
}
