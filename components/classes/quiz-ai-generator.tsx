"use client"

import { useRef, useState } from "react"
import { useMutation } from "@tanstack/react-query"
import { FileUp, Sparkles, X } from "lucide-react"

import type { AiGeneratedQuiz } from "@/lib/quiz-ai"
import { Button } from "@/components/ui/button"
import { Callout } from "@/components/ui/callout"
import { Field, FieldHelp, FieldLabel } from "@/components/ui/field"
import { IconBadge } from "@/components/ui/icon-badge"
import { Panel, PanelBody, PanelDescription, PanelHeader, PanelHeading, PanelTitle } from "@/components/ui/panel"
import { Text } from "@/components/ui/typography"
import { Textarea } from "@/components/ui/textarea"
import { useSupabaseUpload } from "@/lib/supabase-storage"

const MAX_FILES = 5
const ACCEPTED_FILES = ".pdf,.docx,.xlsx,.csv,.txt"

type QuizAiGeneratorProps = {
  classId: string
  disabled?: boolean
  onGenerated: (quiz: AiGeneratedQuiz) => void
}

export function QuizAiGenerator({ classId, disabled = false, onGenerated }: QuizAiGeneratorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [instructions, setInstructions] = useState("")
  const [files, setFiles] = useState<File[]>([])
  const [error, setError] = useState<string | null>(null)
  const { startUpload, isUploading } = useSupabaseUpload("resources")

  const generateQuiz = useMutation({
    mutationFn: async (variables: { uploadedFiles: Array<{ url: string; name: string }> }) => {
      const response = await fetch("/api/ai/quizzes/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId,
          instructions: instructions.trim(),
          files: variables.uploadedFiles,
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate quiz")
      }
      return data.quiz as AiGeneratedQuiz
    },
    onSuccess: (quiz) => {
      onGenerated(quiz)
      setInstructions("")
      setFiles([])
    },
    onError: (generationError: unknown) => {
      setError(
        generationError instanceof Error ? generationError.message : "Failed to generate quiz",
      )
    },
  })

  const removeFile = (name: string) => {
    setFiles((currentFiles) => currentFiles.filter((file) => file.name !== name))
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(event.target.files || [])
    const uniqueFiles = selectedFiles.filter(
      (file) => !files.some((existing) => existing.name === file.name && existing.size === file.size),
    )
    const nextFiles = [...files, ...uniqueFiles]

    if (nextFiles.length > MAX_FILES) {
      setError(`Upload up to ${MAX_FILES} reference files`)
      return
    }

    setFiles(nextFiles)
    setError(null)
    event.target.value = ""
  }

  const handleGenerate = async () => {
    if (!instructions.trim() && files.length === 0) {
      setError("Add instructions or at least one reference file")
      return
    }
    if (!navigator.onLine) {
      setError("AI quiz generation requires an internet connection")
      return
    }

    setError(null)

    const uploadedFiles = files.length > 0 ? await startUpload(files) : []
    if (files.length > 0 && (!uploadedFiles || uploadedFiles.length !== files.length)) {
      setError("One or more reference files could not be uploaded")
      return
    }

    generateQuiz.mutate({
      uploadedFiles: (uploadedFiles || []).map((file) => ({ url: file.url, name: file.name })),
    })
  }

  const busy = disabled || generateQuiz.isPending || isUploading

  return (
    <Panel padding="none" className="overflow-hidden">
      <PanelHeader>
        <PanelHeading>
          <PanelTitle><Sparkles className="size-4 text-primary-strong" /> Generate with AI</PanelTitle>
          <PanelDescription>Use teaching instructions, reference files, or both. Generated questions remain editable.</PanelDescription>
        </PanelHeading>
      </PanelHeader>
      <PanelBody className="space-y-4">
        <Field>
          <FieldLabel htmlFor="quiz-ai-instructions" optional>Teacher instructions</FieldLabel>
          <Textarea
            id="quiz-ai-instructions"
            value={instructions}
            onChange={(event) => setInstructions(event.target.value)}
            placeholder="Example: Create a 10-question quiz for Grade 8. Focus on key vocabulary and include two short-answer questions."
            rows={3}
            className="resize-none"
            disabled={busy}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="quiz-ai-files" optional hint={`${MAX_FILES} files max`}>Reference files</FieldLabel>
          <input
            ref={fileInputRef}
            id="quiz-ai-files"
            type="file"
            accept={ACCEPTED_FILES}
            multiple
            onChange={handleFileChange}
            disabled={busy}
            className="sr-only"
          />
          <label
            htmlFor="quiz-ai-files"
            className="focus-ring flex cursor-pointer items-center gap-3 rounded-lg border border-dashed border-hairline-strong bg-surface-sunken px-4 py-3 transition-colors hover:bg-muted"
          >
            <IconBadge tone="primary" size="sm"><FileUp /></IconBadge>
            <div className="min-w-0">
              <Text variant="small" className="font-medium">Add reference files</Text>
              <Text variant="caption" tone="muted">PDF, DOCX, XLSX, CSV, or text</Text>
            </div>
          </label>
          <FieldHelp>Files are uploaded only to generate this quiz and are not added as class resources.</FieldHelp>

          {files.length > 0 ? (
            <div className="mt-3 space-y-2">
              {files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="flex items-center gap-3 rounded-md border border-hairline bg-card px-3 py-2">
                  <FileUp className="size-4 shrink-0 text-muted-foreground" />
                  <Text variant="small" truncate className="min-w-0 flex-1">{file.name}</Text>
                  <Text variant="caption" tone="muted">{(file.size / 1024 / 1024).toFixed(1)} MB</Text>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    aria-label={`Remove ${file.name}`}
                    onClick={() => removeFile(file.name)}
                    disabled={busy}
                  >
                    <X />
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </Field>

        {error ? <Callout tone="danger" role="alert">{error}</Callout> : null}

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => void handleGenerate()}
          isLoading={generateQuiz.isPending || isUploading}
          disabled={busy || (!instructions.trim() && files.length === 0)}
        >
          {generateQuiz.isPending || isUploading ? "Generating quiz…" : "Generate questions"}
        </Button>
      </PanelBody>
    </Panel>
  )
}
