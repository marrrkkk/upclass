"use client"

import { useState } from "react"
import { Check, Copy, Settings } from "lucide-react"

import { ClassSettingsDialog } from "@/components/classes/class-settings-dialog"
import type { ClassData } from "@/types/classes"

type ClassDetailTeacherActionsProps = {
  classData: ClassData
}

export function ClassDetailTeacherActions({ classData }: ClassDetailTeacherActionsProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = async () => {
    await navigator.clipboard.writeText(classData.code)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex w-full items-center justify-between gap-2 rounded-lg border border-white/20 bg-white/10 p-2 pr-3 backdrop-blur-md sm:w-auto sm:justify-start">
      <div className="min-w-0 px-2">
        <p className="text-[10px] font-medium uppercase tracking-wider text-blue-100">Class Code</p>
        <p className="font-mono text-xl font-bold leading-none">{classData.code}</p>
      </div>
      <div className="ml-1 flex items-center gap-1">
        <button
          onClick={handleCopyCode}
          className="flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-white/20"
          type="button"
          title="Copy class code"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
        </button>
        <ClassSettingsDialog
          classData={classData}
          trigger={
            <button className="flex h-8 w-8 items-center justify-center rounded-md border border-white/20 bg-white/10 backdrop-blur-md transition-colors hover:bg-white/20">
              <Settings className="h-4 w-4" />
            </button>
          }
        />
      </div>
    </div>
  )
}
