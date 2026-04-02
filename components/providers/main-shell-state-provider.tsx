"use client"

import { createContext, useContext } from "react"

type MainShellUserInfo = {
  name: string | null
  email: string | null
  image: string | null
}

export type MainShellState = {
  hasRole: boolean
  isAuthenticated: boolean
  isShellResolved: boolean
  userId?: string
  userInfo?: MainShellUserInfo | null
  userRole: "teacher" | "student" | null
}

const MainShellStateContext = createContext<MainShellState | null>(null)

export function MainShellStateProvider({
  children,
  value,
}: {
  children: React.ReactNode
  value: MainShellState
}) {
  return (
    <MainShellStateContext.Provider value={value}>
      {children}
    </MainShellStateContext.Provider>
  )
}

export function useMainShellState() {
  const value = useContext(MainShellStateContext)

  if (!value) {
    throw new Error("useMainShellState must be used within MainShellStateProvider")
  }

  return value
}
