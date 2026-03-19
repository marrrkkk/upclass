"use client"

import { create } from "zustand"

import type { SaveStatus, WhiteboardTool } from "@/whiteboard/types"

type WhiteboardUiState = {
  activeTool: WhiteboardTool
  isUploading: boolean
  saveStatus: SaveStatus
  setActiveTool: (tool: WhiteboardTool) => void
  setIsUploading: (isUploading: boolean) => void
  setSaveStatus: (status: SaveStatus) => void
}

export const useWhiteboardUiStore = create<WhiteboardUiState>((set) => ({
  activeTool: "select",
  isUploading: false,
  saveStatus: "saved",
  setActiveTool: (activeTool) => set({ activeTool }),
  setIsUploading: (isUploading) => set({ isUploading }),
  setSaveStatus: (saveStatus) => set({ saveStatus }),
}))
