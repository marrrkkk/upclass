"use client"

import type { ReactNode } from "react"

import { authClient } from "@/lib/auth-client"
import { Button } from "@/components/ui/button"

type SocialProvider =
  | "github"
  | "apple"
  | "discord"
  | "facebook"
  | "google"
  | "microsoft"
  | "spotify"
  | "twitch"
  | "twitter"
  | "dropbox"
  | "linkedin"
  | "gitlab"
  | "tiktok"
  | "reddit"
  | "roblox"
  | "vk"
  | "kick"

export default function SocialButton({
  provider,
  children,
  className,
}: {
  provider: SocialProvider
  children: ReactNode
  className?: string
}) {
  return (
    <Button
      onClick={async () => {
        await authClient.signIn.social({
          provider,
          callbackURL: "/org",
        })
      }}
      type="button"
      variant="secondary"
      className={className}
    >
      {children}
    </Button>
  )
}
