"use client"

import { useRouter } from "next/navigation"
import Link from "next/link"
import { LogOut, User, Settings, Loader2 } from "lucide-react"
import { useState } from "react"

import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu"

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
            router.replace("/")
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
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60 p-1" sideOffset={8}>
        <div className="flex items-center gap-2 p-2">
          <Avatar className="h-8 w-8 border border-border/50">
            <AvatarImage src={image || undefined} alt={name || "User"} />
            <AvatarFallback className="bg-gradient-to-br from-indigo-500 to-purple-500 text-white text-xs font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col space-y-0.5 leading-none">
            {name && <p className="text-sm font-semibold text-foreground">{name}</p>}
            {email && (
              <p className="text-xs text-muted-foreground truncate opacity-80 max-w-[150px]">{email}</p>
            )}
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuGroup>
          <DropdownMenuItem asChild>
            <Link href={userId ? `/user/${userId}` : "/profile"} className="cursor-pointer font-medium">
              <User className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Profile</span>
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem asChild>
            <Link href="/settings" className="cursor-pointer font-medium">
              <Settings className="mr-2 h-4 w-4 text-muted-foreground" />
              <span>Settings</span>
            </Link>
          </DropdownMenuItem>
        </DropdownMenuGroup>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleSignOut}
          disabled={pending}
          className="text-destructive focus:bg-destructive/10 focus:text-destructive cursor-pointer font-medium"
        >
          {pending ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              <span>Signing out...</span>
            </>
          ) : (
            <>
              <LogOut className="mr-2 h-4 w-4" />
              <span>Sign out</span>
            </>
          )}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
