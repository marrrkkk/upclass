"use client"

import { createContext, useContext, useState } from "react"

type PageHeaderContextType = {
  rightSideContent: React.ReactNode | null
  setRightSideContent: (content: React.ReactNode | null) => void
}

const PageHeaderContext = createContext<PageHeaderContextType | undefined>(undefined)

export function PageHeaderProvider({ children }: { children: React.ReactNode }) {
  const [rightSideContent, setRightSideContent] = useState<React.ReactNode | null>(null)

  return (
    <PageHeaderContext.Provider value={{ rightSideContent, setRightSideContent }}>
      {children}
    </PageHeaderContext.Provider>
  )
}

export function usePageHeader() {
  const context = useContext(PageHeaderContext)
  if (!context) {
    throw new Error("usePageHeader must be used within PageHeaderProvider")
  }
  return context
}

