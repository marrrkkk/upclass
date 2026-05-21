"use client";

import React from "react";
import { Button } from "../ui/button";
import { authClient } from "@/lib/auth-client";

export default function SocialButton({
  provider,
  children,
  className,
}: {
  provider:
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
  | "kick";
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Button
      onClick={async () => {
        await authClient.signIn.social({
          provider,
          callbackURL: "/",
        });
      }}
      type="button"
      variant={"outline"}
      className={className}
    >
      {children}
    </Button>
  );
}