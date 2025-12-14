"use client"

import { SyncManager } from "./sync-manager"

export type OfflineAction = {
  type: string
  payload: any
  timestamp: number
}

/**
 * Check if user is online and handle offline actions
 */
export async function checkOnlineAndHandle(action: () => Promise<any>): Promise<{ success: boolean; error?: string; queued?: boolean }> {
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
  } catch (error: any) {
    // If it's a network error, queue the action
    if (error.message?.includes('fetch') || error.message?.includes('network') || !navigator.onLine) {
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
export function queueOfflineAction(type: string, payload: any): void {
  const syncManager = SyncManager.getInstance()
  syncManager.addPendingAction(type, payload)
}

/**
 * Enhanced action wrapper that handles offline scenarios
 */
export async function executeWithOfflineHandling<T>(
  action: () => Promise<{ success: boolean; error?: string }>,
  actionType: string,
  actionPayload: any
): Promise<{ success: boolean; error?: string; queued?: boolean }> {
  if (!navigator.onLine) {
    // Queue the action
    queueOfflineAction(actionType, actionPayload)
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
      queueOfflineAction(actionType, actionPayload)
      return {
        ...result,
        queued: true,
        error: result.error + " This action has been queued for sync.",
      }
    }
    
    return result
  } catch (error: any) {
    // Network error - queue the action
    if (error.message?.includes('fetch') || error.message?.includes('network') || !navigator.onLine) {
      queueOfflineAction(actionType, actionPayload)
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

