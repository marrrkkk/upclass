/* eslint-disable @typescript-eslint/no-explicit-any */
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
      case 'create-class': {
        // Sync class creation
        const { createClass } = await import('@/app/actions/classes')
        const formData = new FormData()
        Object.entries(action.data).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        const result = await createClass(formData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync class creation')
        }
        break
      }
      case 'create-resource': {
        // Sync resource creation
        const { createResource } = await import('@/app/actions/resources')
        const formData = new FormData()
        Object.entries(action.data).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        const result = await createResource(formData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync resource creation')
        }
        break
      }
      case 'join-class': {
        // Sync class join
        const { joinClass } = await import('@/app/actions/classes')
        const formData = new FormData()
        Object.entries(action.data).forEach(([key, value]) => {
          formData.append(key, String(value))
        })
        const result = await joinClass(formData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync class join')
        }
        break
      }
      case 'create-classwork': {
        // Sync classwork creation
        const { createClasswork } = await import('@/app/actions/class-detail')
        const formData = new FormData()
        Object.entries(action.data).forEach(([key, value]) => {
          if (key !== 'classId') {
            formData.append(key, String(value))
          }
        })
        const result = await createClasswork(action.data.classId, formData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync classwork creation')
        }
        break
      }
      case 'submit-classwork': {
        // Sync classwork submission
        const { submitClasswork } = await import('@/app/actions/class-detail')
        const formData = new FormData()
        Object.entries(action.data).forEach(([key, value]) => {
          if (key !== 'classworkId') {
            formData.append(key, String(value))
          }
        })
        const result = await submitClasswork(action.data.classworkId, formData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync classwork submission')
        }
        break
      }
      case 'create-announcement': {
        // Sync announcement creation
        const { createAnnouncement } = await import('@/app/actions/class-detail')
        const formData = new FormData()
        Object.entries(action.data).forEach(([key, value]) => {
          if (key !== 'classId') {
            formData.append(key, String(value))
          }
        })
        const result = await createAnnouncement(action.data.classId, formData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync announcement creation')
        }
        break
      }
      case 'create-quiz': {
        // Sync quiz creation
        const { createQuiz } = await import('@/app/actions/quizzes')
        const formData = new FormData()
        formData.append('payload', JSON.stringify(action.data.payload))
        const result = await createQuiz(action.data.classId, formData)
        if (!result.success) {
          throw new Error(result.error || 'Failed to sync quiz creation')
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

