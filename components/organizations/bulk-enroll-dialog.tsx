"use client"

import * as React from "react"
import { useState, useTransition } from "react"
import { CheckIcon, Users } from "lucide-react"

import { cn } from "@/lib/utils"
import { bulkEnroll } from "@/app/actions/enrollments"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface Student {
  userId: string
  name: string
  email: string
}

interface ClassOption {
  id: string
  title: string
}

interface BulkEnrollDialogProps {
  orgId: string
  students: Student[]
  classes: ClassOption[]
  open: boolean
  onOpenChange: (open: boolean) => void
}

interface EnrollmentSummary {
  enrolled: number
  skipped: number
  failed: string[]
}

export function BulkEnrollDialog({
  orgId,
  students,
  classes,
  open,
  onOpenChange,
}: BulkEnrollDialogProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<Set<string>>(
    new Set()
  )
  const [selectedClassId, setSelectedClassId] = useState<string>("")
  const [searchQuery, setSearchQuery] = useState("")
  const [summary, setSummary] = useState<EnrollmentSummary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const filteredStudents = students.filter(
    (student) =>
      student.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      student.email.toLowerCase().includes(searchQuery.toLowerCase())
  )

  function toggleStudent(userId: string) {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(userId)) {
        next.delete(userId)
      } else {
        next.add(userId)
      }
      return next
    })
  }

  function toggleAll() {
    if (selectedStudentIds.size === filteredStudents.length) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.userId)))
    }
  }

  function handleSubmit() {
    if (!selectedClassId || selectedStudentIds.size === 0) return

    setError(null)
    startTransition(async () => {
      const result = await bulkEnroll(
        orgId,
        selectedClassId,
        Array.from(selectedStudentIds)
      )

      if (result.success) {
        setSummary(result.data)
      } else {
        setError(result.error)
      }
    })
  }

  function handleClose(isOpen: boolean) {
    if (!isOpen) {
      // Reset state on close
      setSelectedStudentIds(new Set())
      setSelectedClassId("")
      setSearchQuery("")
      setSummary(null)
      setError(null)
    }
    onOpenChange(isOpen)
  }

  const allSelected =
    filteredStudents.length > 0 &&
    selectedStudentIds.size === filteredStudents.length

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5" />
            Bulk Enroll Students
          </DialogTitle>
          <DialogDescription>
            Select students and a class to enroll them in.
          </DialogDescription>
        </DialogHeader>

        {summary ? (
          <div className="space-y-4">
            <div className="rounded-lg border p-4 space-y-2">
              <h4 className="font-medium text-sm">Enrollment Summary</h4>
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md bg-green-500/10 p-3">
                  <p className="text-2xl font-bold text-green-600">
                    {summary.enrolled}
                  </p>
                  <p className="text-xs text-muted-foreground">Enrolled</p>
                </div>
                <div className="rounded-md bg-yellow-500/10 p-3">
                  <p className="text-2xl font-bold text-yellow-600">
                    {summary.skipped}
                  </p>
                  <p className="text-xs text-muted-foreground">Skipped</p>
                </div>
                <div className="rounded-md bg-red-500/10 p-3">
                  <p className="text-2xl font-bold text-red-600">
                    {summary.failed.length}
                  </p>
                  <p className="text-xs text-muted-foreground">Failed</p>
                </div>
              </div>
              {summary.failed.length > 0 && (
                <div className="mt-2">
                  <p className="text-xs text-muted-foreground">
                    Failed student IDs: {summary.failed.join(", ")}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button onClick={() => handleClose(false)}>Done</Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Class selector */}
            <div className="space-y-2">
              <Label htmlFor="class-select">Target Class</Label>
              <Select
                value={selectedClassId}
                onValueChange={setSelectedClassId}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Student picker */}
            <div className="space-y-2">
              <Label>Students ({selectedStudentIds.size} selected)</Label>
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <div className="rounded-md border">
                {/* Select all header */}
                <div className="flex items-center gap-3 border-b px-3 py-2">
                  <Checkbox
                    checked={allSelected}
                    onCheckedChange={toggleAll}
                    aria-label="Select all students"
                  />
                  <span className="text-sm text-muted-foreground">
                    {allSelected ? "Deselect all" : "Select all"}
                  </span>
                </div>
                {/* Scrollable student list */}
                <div className="max-h-[200px] overflow-y-auto">
                  {filteredStudents.length === 0 ? (
                    <p className="px-3 py-4 text-center text-sm text-muted-foreground">
                      No students found.
                    </p>
                  ) : (
                    filteredStudents.map((student) => (
                      <label
                        key={student.userId}
                        className={cn(
                          "flex cursor-pointer items-center gap-3 px-3 py-2 hover:bg-accent transition-colors",
                          selectedStudentIds.has(student.userId) && "bg-accent/50"
                        )}
                      >
                        <Checkbox
                          checked={selectedStudentIds.has(student.userId)}
                          onCheckedChange={() => toggleStudent(student.userId)}
                          aria-label={`Select ${student.name}`}
                        />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {student.name}
                          </p>
                          <p className="truncate text-xs text-muted-foreground">
                            {student.email}
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>
            </div>

            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}

            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => handleClose(false)}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  isPending ||
                  selectedStudentIds.size === 0 ||
                  !selectedClassId
                }
              >
                {isPending ? "Enrolling..." : `Enroll ${selectedStudentIds.size} Student${selectedStudentIds.size !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
