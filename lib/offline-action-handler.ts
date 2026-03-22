"use client"

import type { OfflineActionPayload, OfflineActionType } from "@/lib/offline-queue"
import { SyncManager } from "./sync-manager"

/**
 * Check if user is online and handle offline actions
 */
export async function checkOnlineAndHandle(
  action: () => Promise<{ success: boolean; error?: string }>,
): Promise<{ success: boolean; error?: string; queued?: boolean }> {
  if (!navigator.onLine) {
    return {
      success: false,
      error: "You're offline. This action will be queued and synced when you're back online.",
      queued: false, // We'll queue it separately
    }
  }

  try {
    // Try to execute the action
    const result = await action()
    return result
  } catch (error: unknown) {
    // If it's a network error, queue the action
    if (
      error instanceof Error &&
      (error.message?.includes("fetch") || error.message?.includes("network") || !navigator.onLine)
    ) {
      return {
        success: false,
        error: "Network error. This action will be queued and synced when you're back online.",
        queued: false,
      }
    }
    throw error
  }
}

/**
 * Queue an action for offline sync
 */
export async function queueOfflineAction<T extends OfflineActionType>(
  type: T,
  payload: OfflineActionPayload<T>,
): Promise<void> {
  const syncManager = SyncManager.getInstance()
  await syncManager.addPendingAction(type, payload)
}

/**
 * Enhanced action wrapper that handles offline scenarios
 */
export async function executeWithOfflineHandling<T extends OfflineActionType>(
  action: () => Promise<{ success: boolean; error?: string }>,
  actionType: T,
  actionPayload: OfflineActionPayload<T>,
): Promise<{ success: boolean; error?: string; queued?: boolean }> {
  if (!navigator.onLine) {
    // Queue the action
    await queueOfflineAction(actionType, actionPayload)
    return {
      success: false,
      error: "You're offline. This action has been queued and will be synced when you're back online.",
      queued: true,
    }
  }

  try {
    const result = await action()
    
    // If action failed due to network, queue it
    if (!result.success && (result.error?.includes('network') || result.error?.includes('fetch'))) {
      await queueOfflineAction(actionType, actionPayload)
      return {
        ...result,
        queued: true,
        error: result.error + " This action has been queued for sync.",
      }
    }
    
    return result
  } catch (error: unknown) {
    // Network error - queue the action
    if (
      error instanceof Error &&
      (error.message?.includes("fetch") || error.message?.includes("network") || !navigator.onLine)
    ) {
      await queueOfflineAction(actionType, actionPayload)
      return {
        success: false,
        error: "Network error. This action has been queued and will be synced when you're back online.",
        queued: true,
      }
    }
    
    // Re-throw non-network errors
    throw error
  }
}
