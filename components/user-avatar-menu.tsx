"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, User, Settings, Sparkles } from "lucide-react"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"
import { Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

type UserAvatarMenuProps = {
  name: string | null
  email: string | null
  image: string | null
  userId?: string
}

export function UserAvatarMenu({ name, email, image, userId }: UserAvatarMenuProps) {
  const router = useRouter()
  const [pending, setPending] = useState(false)

  const handleSignOut = async () => {
    try {
      setPending(true)
      await authClient.signOut({
        fetchOptions: {
          onSuccess: () => {
            router.push("/sign-in")
            router.refresh()
          },
        },
      })
    } catch (error) {
      console.error("Error signing out:", error)
    } finally {
      setPending(false)
    }
  }

  const initials = name
    ? name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
    : email?.[0]?.toUpperCase() ?? "U"

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-primary/20 hover:scale-105 focus:outline-none focus:ring-primary/30"
          type="button"
        >
          <Avatar className="h-9 w-9 border border-border/50">
            <AvatarImage src={image || undefined} alt={name || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-primary to-primary/60 text-primary-foreground font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64 p-2" sideOffset={8}>
        <DropdownMenuLabel className="font-normal p-2">
          <div className="flex flex-col space-y-1">
            {name && <p className="text-sm font-semibold leading-none text-foreground">{name}</p>}
            {email && (
              <p className="text-xs leading-none text-muted-foreground truncate opacity-80">{email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1 bg-border/50" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="p-2 cursor-pointer focus:bg-primary/5">
            <Link href={userId ? `/user/${userId}` : "/profile"} className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary ring-1 ring-primary/20">
                <User className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-medium">Profile</span>
                <span className="text-[11px] text-muted-foreground">View your details</span>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="p-2 cursor-pointer focus:bg-primary/5">
            <Link href="/settings" className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-muted text-muted-foreground ring-1 ring-border">
                <Settings className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-medium">Settings</span>
                <span className="text-[11px] text-muted-foreground">Manage preferences</span>
              </div>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-1 bg-border/50" />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={pending}
          className="p-2 text-destructive focus:bg-destructive/5 focus:text-destructive cursor-pointer group"
        >
          {pending ? (
            <div className="flex items-center justify-center w-full py-1.5">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span className="text-sm font-medium">Signing out...</span>
            </div>
          ) : (
            <div className="flex items-center gap-3 w-full">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-destructive/10 group-hover:bg-destructive/20 transition-colors ring-1 ring-destructive/20">
                <LogOut className="h-4.5 w-4.5" />
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-medium">Sign out</span>
                <span className="text-[11px] text-muted-foreground/80 group-hover:text-destructive/80">End your session</span>
              </div>
            </div>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

