import { create } from "zustand"

type ResourceCardData = {
  id: string
  title: string
  description: string | null
  category: string | null
  fileUrl: string
  fileName: string
  fileType: string
  fileSize: string | null
  createdAt: string
  authorName: string | null
  authorImage: string | null
}

type ResourcesState = {
  resources: ResourceCardData[]
  isAuthenticated: boolean
  setResources: (resources: ResourceCardData[]) => void
  setIsAuthenticated: (isAuthenticated: boolean) => void
  addResource: (resource: ResourceCardData) => void
  updateResource: (resourceId: string, updates: Partial<ResourceCardData>) => void
  removeResource: (resourceId: string) => void
  clearResources: () => void
}

export const useResourcesStore = create<ResourcesState>((set) => ({
  resources: [],
  isAuthenticated: false,
  setResources: (resources) => set({ resources }),
  setIsAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
  addResource: (resource) =>
    set((state) => ({
      resources: [resource, ...state.resources],
    })),
  updateResource: (resourceId, updates) =>
    set((state) => ({
      resources: state.resources.map((r) =>
        r.id === resourceId ? { ...r, ...updates } : r,
      ),
    })),
  removeResource: (resourceId) =>
    set((state) => ({
      resources: state.resources.filter((r) => r.id !== resourceId),
    })),
  clearResources: () =>
    set({
      resources: [],
      isAuthenticated: false,
    }),
}))
