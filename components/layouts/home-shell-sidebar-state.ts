import { create } from "zustand"

type HomeShellSidebarState = {
  isOpen: boolean
  setOpen: (open: boolean) => void
  toggle: () => void
}

export const useHomeShellSidebarState = create<HomeShellSidebarState>((set) => ({
  isOpen: false,
  setOpen: (open) => set({ isOpen: open }),
  toggle: () => set((state) => ({ isOpen: !state.isOpen })),
}))

