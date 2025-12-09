"use client"

import { ExternalLink } from "lucide-react"
import { cn } from "@/lib/utils"

type UrlLinkifyProps = {
  text: string
  className?: string
  linkClassName?: string
}

// URL regex pattern
const urlRegex = /(https?:\/\/[^\s]+)/g

export function UrlLinkify({ text, className, linkClassName }: UrlLinkifyProps) {
  const parts = text.split(urlRegex)
  
  return (
    <span className={className}>
      {parts.map((part, index) => {
        if (urlRegex.test(part)) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className={cn("inline-flex items-center gap-1 underline hover:opacity-80", linkClassName)}
            >
              {part}
              <ExternalLink className="h-3 w-3" />
            </a>
          )
        }
        return <span key={index}>{part}</span>
      })}
    </span>
  )
}

