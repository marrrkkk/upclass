"use client"

import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { useState } from "react"
import { Button } from "../ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog"

export default function SignoutButton() {
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

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button isLoading={pending} disabled={pending}>
          {pending ? null : "Sign out"}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Are you sure you want to sign out?</AlertDialogTitle>
          <AlertDialogDescription>
            You will be redirected to the sign-in page and will need to authenticate again to access your account.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleSignOut} disabled={pending} asChild>
            <Button isLoading={pending}>
              {pending ? "Signing out..." : "Sign out"}
            </Button>
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
