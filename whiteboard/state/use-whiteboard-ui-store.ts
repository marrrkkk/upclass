"use client"

import { create } from "zustand"

import type { SaveStatus, WhiteboardTool } from "@/whiteboard/types"

type WhiteboardUiState = {
  activeTool: WhiteboardTool
  isUploading: boolean
  saveStatus: SaveStatus
  /** Canvas zoom as a fraction (1 = 100%), mirrored from Excalidraw. */
  zoom: number
  setActiveTool: (tool: WhiteboardTool) => void
  setIsUploading: (isUploading: boolean) => void
  setSaveStatus: (status: SaveStatus) => void
  setZoom: (zoom: number) => void
}

export const useWhiteboardUiStore = create<WhiteboardUiState>((set) => ({
  activeTool: "select",
  isUploading: false,
  saveStatus: "saved",
  zoom: 1,
  setActiveTool: (activeTool) => set({ activeTool }),
  setIsUploading: (isUploading) => set({ isUploading }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
  setZoom: (zoom) => set({ zoom }),
}))
