import { create } from "zustand"

type PageHeaderState = {
  rightSideContent: React.ReactNode | null
  mobileRightSideContent: React.ReactNode | null
  pageTitle: string | null
  setRightSideContent: (content: React.ReactNode | null) => void
  setMobileRightSideContent: (content: React.ReactNode | null) => void
  setPageTitle: (title: string | null) => void
}

export const usePageHeaderStore = create<PageHeaderState>((set) => ({
  rightSideContent: null,
  mobileRightSideContent: null,
  pageTitle: null,
  setRightSideContent: (content) => set({ rightSideContent: content }),
  setMobileRightSideContent: (content) => set({ mobileRightSideContent: content }),
  setPageTitle: (title) => set({ pageTitle: title }),
}))


