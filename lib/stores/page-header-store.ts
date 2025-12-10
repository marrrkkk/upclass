import { create } from "zustand"

type PageHeaderState = {
  rightSideContent: React.ReactNode | null
  pageTitle: string | null
  setRightSideContent: (content: React.ReactNode | null) => void
  setPageTitle: (title: string | null) => void
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  rightSideContent: null,
  pageTitle: null,
  setRightSideContent: (content) => set({ rightSideContent: content }),
  setPageTitle: (title) => set({ pageTitle: title }),
}))

