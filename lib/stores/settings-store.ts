import { create } from "zustand"

type UserData = {
  id: string
  name: string
  email: string
  image: string | null
  bio: string | null
  role: "teacher" | "student" | null
  emailNotifications: boolean
  pushNotifications: boolean
  classNotifications: boolean
  messageNotifications: boolean
  profileVisibility: string
  showEmail: boolean
  showClasses: boolean
  showResources: boolean
}

type SettingsState = {
  userData: UserData | null
  setUserData: (userData: UserData) => void
  updateUserData: (updates: Partial<UserData>) => void
  clearSettings: () => void
}

export const useSettingsStore = create<SettingsState>((set) => ({
  userData: null,
  setUserData: (userData) => set({ userData }),
  updateUserData: (updates) =>
    set((state) => ({
      userData: state.userData ? { ...state.userData, ...updates } : null,
    })),
  clearSettings: () => set({ userData: null }),
}))
