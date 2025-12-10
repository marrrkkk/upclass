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
          className="relative flex h-9 w-9 shrink-0 overflow-hidden rounded-full ring-2 ring-transparent transition-all hover:ring-primary/20 hover:scale-105 focus:outline-none focus:ring-primary/30 cursor-pointer"
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
      <DropdownMenuContent align="end" className="w-60 p-2" sideOffset={5}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1 p-1">
            {name && <p className="text-sm font-semibold leading-none text-foreground">{name}</p>}
            {email && (
              <p className="text-xs leading-none text-muted-foreground truncate opacity-80">{email}</p>
            )}
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuGroup>
          <DropdownMenuItem asChild className="p-2 cursor-pointer">
            <Link href={userId ? `/home/user/${userId}` : "/home/profile"} className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-medium">Profile</span>
                <span className="text-[10px] text-muted-foreground">View your details</span>
              </div>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild className="p-2 cursor-pointer">
            <Link href="/home/settings" className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Settings className="h-4 w-4" />
              </div>
              <div className="flex flex-col space-y-0.5">
                <span className="text-sm font-medium">Settings</span>
                <span className="text-[10px] text-muted-foreground">Manage preferences</span>
              </div>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        {/* Optional Premium Badge Area */}
        <div className="my-2 p-2 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 rounded-md border border-violet-500/20">
          <div className="flex items-center gap-2 mb-1">
            <Sparkles className="h-3 w-3 text-violet-500" />
            <span className="text-[10px] font-bold text-violet-600 bg-clip-text uppercase">Pro Plan</span>
          </div>
          <p className="text-[10px] text-muted-foreground leading-tight">
            You are on the professional plan.
          </p>
        </div>

        <DropdownMenuSeparator className="my-1" />
        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={pending}
          className="p-2 text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer group"
        >
          {pending ? (
            <div className="flex items-center justify-center w-full py-1">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Signing out...</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 w-full">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-destructive/10 group-hover:bg-destructive/20 transition-colors">
                <LogOut className="h-4 w-4" />
              </div>
              <span className="font-medium">Sign out</span>
            </div>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

