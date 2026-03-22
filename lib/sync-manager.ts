"use client"

import {
  clearOfflineActions,
  countOfflineActions,
  enqueueOfflineAction,
  listOfflineActions,
  type OfflineActionPayload,
  type OfflineActionType,
  removeOfflineAction,
  subscribeToOfflineQueue,
  syncOfflineActions,
} from "@/lib/offline-queue"

export class SyncManager {
  private static instance: SyncManager

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  subscribe(listener: () => void) {
    return subscribeToOfflineQueue(listener)
  }

  async addPendingAction<T extends OfflineActionType>(
    type: T,
    data: OfflineActionPayload<T>,
  ) {
    const action = await enqueueOfflineAction(type, data)
    return action.id
  }

  async removePendingAction(id: string) {
    await removeOfflineAction(id)
  }

  async getPendingActions() {
    return await listOfflineActions()
  }

  async getPendingCount() {
    return await countOfflineActions()
  }

  async syncPendingActions() {
    await syncOfflineActions()
  }

  async clearPendingActions() {
    await clearOfflineActions()
  }
}

export function useSyncManager() {
  return SyncManager.getInstance()
}
