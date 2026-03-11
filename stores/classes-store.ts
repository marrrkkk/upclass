import { create } from "zustand"

type ClassCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  color: string | null
  schedule: string | null
  createdAt: string
  enrolledCount: number
  role: "teaching" | "enrolled"
  teacherName: string | null
  teacherImage: string | null
}

type ClassesState = {
  teachingClasses: ClassCardData[]
  enrolledClasses: ClassCardData[]
  userRole: "teacher" | "student" | null
  isAuthenticated: boolean
  setTeachingClasses: (classes: ClassCardData[]) => void
  setEnrolledClasses: (classes: ClassCardData[]) => void
  setUserRole: (role: "teacher" | "student" | null) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  addClass: (classData: ClassCardData, role: "teaching" | "enrolled") => void
  updateClass: (classId: string, updates: Partial<ClassCardData>) => void
  removeClass: (classId: string) => void
  clearClasses: () => void
}

export const useClassesStore = create<ClassesState>((set) => ({
  teachingClasses: [],
  enrolledClasses: [],
  userRole: null,
  isAuthenticated: false,
  setTeachingClasses: (classes) => set({ teachingClasses: classes }),
  setEnrolledClasses: (classes) => set({ enrolledClasses: classes }),
  setUserRole: (role) => set({ userRole: role }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  addClass: (classData, role) =>
    set((state) => {
      if (role === "teaching") {
        return {
          teachingClasses: [...state.teachingClasses, classData],
        }
      } else {
        return {
          enrolledClasses: [...state.enrolledClasses, classData],
        }
      }
    }),
  updateClass: (classId, updates) =>
    set((state) => ({
      teachingClasses: state.teachingClasses.map((c) =>
        c.id === classId ? { ...c, ...updates } : c,
      ),
      enrolledClasses: state.enrolledClasses.map((c) =>
        c.id === classId ? { ...c, ...updates } : c,
      ),
    })),
  removeClass: (classId) =>
    set((state) => ({
      teachingClasses: state.teachingClasses.filter((c) => c.id !== classId),
      enrolledClasses: state.enrolledClasses.filter((c) => c.id !== classId),
    })),
  clearClasses: () =>
    set({
      teachingClasses: [],
      enrolledClasses: [],
      userRole: null,
      isAuthenticated: false,
    }),
}))
