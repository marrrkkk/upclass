"use client"

/**
 * Admin-only knowledge base manager rendered inside the assistant panel.
 * Lets owners/admins curate org memories that the assistant retrieves.
 */
import { useCallback, useEffect, useState } from "react"

import {
  createOrgMemoryAction,
  deleteOrgMemoryAction,
  listOrgMemoriesAction,
  updateOrgMemoryAction,
} from "@/app/actions/ai-memory"
import { useToast } from "@/components/ui/toast"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Spinner } from "@/components/ui/spinner"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"
import type { AiMemoryCategory } from "@/lib/ai/types"
import { BookOpen, Pencil, Plus, Trash2 } from "lucide-react"

type MemoryRow = {
  id: string
  title: string
  content: string
  category: AiMemoryCategory
  updatedAt: string | null
}

const CATEGORY_LABELS: Record<AiMemoryCategory, string> = {
  teaching_rules: "Teaching rules",
  subject_knowledge: "Subject knowledge",
  class_context: "Class context",
  workflow_preferences: "Workflow preferences",
}

export function OrgMemoryManager({ orgSlug }: { orgSlug: string }) {
  const toast = useToast()
  const [memories, setMemories] = useState<MemoryRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState<AiMemoryCategory>("teaching_rules")

  const load = useCallback(async () => {
    setLoading(true)
    const result = await listOrgMemoriesAction(orgSlug)
    if (!result.success) {
      setError(result.error)
      setLoading(false)
      return
    }
    setError(null)
    setMemories((result.memory as MemoryRow[] | undefined) ?? [])
    setLoading(false)
  }, [orgSlug])

  useEffect(() => {
    void load()
  }, [load])

  const resetForm = () => {
    setTitle("")
    setContent("")
    setCategory("teaching_rules")
    setShowForm(false)
    setEditingId(null)
  }

  const save = async () => {
    if (!title.trim() || !content.trim() || saving) return
    setSaving(true)
    const result = editingId
      ? await updateOrgMemoryAction(orgSlug, editingId, {
          title: title.trim(),
          content: content.trim(),
          category,
        })
      : await createOrgMemoryAction(orgSlug, {
          title: title.trim(),
          content: content.trim(),
          category,
        })
    setSaving(false)
    if (!result.success) {
      toast.error("Could not save", result.error)
      return
    }
    toast.success(editingId ? "Entry updated" : "Entry added", undefined)
    resetForm()
    void load()
  }

  const remove = async (memoryId: string) => {
    const result = await deleteOrgMemoryAction(orgSlug, memoryId)
    if (!result.success) {
      toast.error("Could not delete", result.error)
      return
    }
    toast.success("Entry deleted", undefined)
    void load()
  }

  const startEdit = (memory: MemoryRow) => {
    setEditingId(memory.id)
    setTitle(memory.title)
    setContent(memory.content)
    setCategory(memory.category)
    setShowForm(true)
  }

  return (
    <div className="ai-memory-manager">
      <div className="flex items-center justify-between">
        <p className="flex items-center gap-1.5 type-small font-semibold">
          <BookOpen className="size-3.5" aria-hidden="true" /> Knowledge base
        </p>
        {!showForm ? (
          <Button
            type="button"
            size="icon-xs"
            variant="ghost"
            onClick={() => {
              setEditingId(null)
              setTitle("")
              setContent("")
              setCategory("teaching_rules")
              setShowForm(true)
            }}
            aria-label="Add knowledge base entry"
          >
            <Plus className="size-3.5" aria-hidden="true" />
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <div className="mt-2 flex flex-col gap-2 rounded-md border border-hairline-strong p-2">
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Title (e.g. Late work policy)"
            className="h-8 w-full rounded-[var(--radius-control)] border border-hairline-strong bg-card px-2 type-small outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
          />
          <Textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            placeholder="What should the assistant know?"
            rows={3}
            className="min-h-16"
          />
          <select
            value={category}
            onChange={(event) => setCategory(event.target.value as AiMemoryCategory)}
            aria-label="Category"
            className="h-8 w-full rounded-[var(--radius-control)] border border-hairline-strong bg-card px-2 type-small outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
          >
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
          <div className="flex justify-end gap-1.5">
            <Button type="button" size="xs" variant="ghost" onClick={resetForm}>
              Cancel
            </Button>
            <Button
              type="button"
              size="xs"
              onClick={() => void save()}
              disabled={!title.trim() || !content.trim() || saving}
            >
              {saving ? <Spinner className="size-3" aria-hidden="true" /> : null}
              {editingId ? "Update" : "Add"}
            </Button>
          </div>
        </div>
      ) : null}

      <div className="mt-2 flex flex-col gap-1.5">
        {loading ? (
          <div className="flex justify-center py-3">
            <Spinner className="size-4" aria-hidden="true" />
          </div>
        ) : error ? (
          <p className="px-1 type-caption text-destructive">{error}</p>
        ) : memories.length === 0 ? (
          <p className="px-1 type-caption text-muted-foreground">
            No entries yet. Teach the assistant things it can’t learn from your data.
          </p>
        ) : (
          memories.map((memory) => (
            <div key={memory.id} className="rounded-md border border-hairline p-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate type-small font-medium">{memory.title}</p>
                  <Badge variant="outline" className="mt-1">
                    {CATEGORY_LABELS[memory.category] ?? memory.category}
                  </Badge>
                </div>
                <div className="flex shrink-0 items-center gap-0.5">
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => startEdit(memory)}
                    aria-label={`Edit ${memory.title}`}
                  >
                    <Pencil className="size-3" aria-hidden="true" />
                  </Button>
                  <Button
                    type="button"
                    size="icon-xs"
                    variant="ghost"
                    onClick={() => void remove(memory.id)}
                    aria-label={`Delete ${memory.title}`}
                    className={cn("text-muted-foreground hover:text-destructive")}
                  >
                    <Trash2 className="size-3" aria-hidden="true" />
                  </Button>
                </div>
              </div>
              <p className="mt-1.5 line-clamp-3 type-caption text-muted-foreground">
                {memory.content}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}