import { create } from "zustand"

import type { ResourceCardData } from "@/lib/main-app-queries"

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
      resources: state.resources.map((resource) =>
        resource.id === resourceId ? { ...resource, ...updates } : resource,
      ),
    })),
  removeResource: (resourceId) =>
    set((state) => ({
      resources: state.resources.filter((resource) => resource.id !== resourceId),
    })),
  clearResources: () =>
    set({
      resources: [],
      isAuthenticated: false,
    }),
}))
