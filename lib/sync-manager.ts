"use client"

type PendingAction = {
  id: string
  type: string
  data: any
  timestamp: number
}

const STORAGE_KEY = 'upclass-pending-actions'

export class SyncManager {
  private static instance: SyncManager
  private pendingActions: PendingAction[] = []

  private constructor() {
    this.loadPendingActions()
  }

  static getInstance(): SyncManager {
    if (!SyncManager.instance) {
      SyncManager.instance = new SyncManager()
    }
    return SyncManager.instance
  }

  private loadPendingActions() {
    if (typeof window === 'undefined') return
    
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        this.pendingActions = JSON.parse(stored)
      }
    } catch (error) {
      console.error('Failed to load pending actions:', error)
      this.pendingActions = []
    }
  }

  private savePendingActions() {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.pendingActions))
    } catch (error) {
      console.error('Failed to save pending actions:', error)
    }
  }

  addPendingAction(type: string, data: any): string {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const action: PendingAction = {
      id,
      type,
      data,
      timestamp: Date.now(),
    }
    
    this.pendingActions.push(action)
    this.savePendingActions()
    
    return id
  }

  removePendingAction(id: string) {
    this.pendingActions = this.pendingActions.filter(action => action.id !== id)
    this.savePendingActions()
  }

  getPendingActions(): PendingAction[] {
    return [...this.pendingActions]
  }

  async syncPendingActions(): Promise<void> {
    if (!navigator.onLine) {
      console.log('Offline - cannot sync')
      return
    }

    const actions = this.getPendingActions()
    if (actions.length === 0) {
      return
    }

    console.log(`Syncing ${actions.length} pending actions...`)

    // Process actions in order
    for (const action of actions) {
      try {
        await this.processAction(action)
        this.removePendingAction(action.id)
      } catch (error) {
        console.error(`Failed to sync action ${action.id}:`, error)
        // Keep the action for retry
      }
    }

    console.log('Sync completed')
  }

  private async processAction(action: PendingAction): Promise<void> {
    switch (action.type) {
      case 'whiteboard-update': {
        // Sync whiteboard changes
        const { updateWhiteboard } = await import('@/app/actions/whiteboard')
        const result = await updateWhiteboard(action.data.whiteboardId, action.data.data)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync whiteboard')
        }
        break
      }
      case 'message-send':
        // Sync message - implement when needed
        // const { sendMessage } = await import('@/app/actions/messages')
        // await sendMessage(action.data)
        break
      // Add more action types as needed
      default:
        console.warn(`Unknown action type: ${action.type}`)
    }
  }

  clearPendingActions() {
    this.pendingActions = []
    this.savePendingActions()
  }
}

// Helper function to use in components
export function useSyncManager() {
  return SyncManager.getInstance()
}

