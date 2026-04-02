/* eslint-disable @typescript-eslint/no-explicit-any */
"use client"

// Background cache manager for all data types
export class BackgroundCache {
  private static instance: BackgroundCache
  private dbName = 'upclass-cache'
  private dbVersion = 3
  private db: IDBDatabase | null = null

  private constructor() {
    this.initDB()
  }

  static getInstance(): BackgroundCache {
    if (!BackgroundCache.instance) {
      BackgroundCache.instance = new BackgroundCache()
    }
    return BackgroundCache.instance
  }

  private async initDB(): Promise<void> {
    if (typeof window === 'undefined' || !('indexedDB' in window)) {
      return
    }

    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.dbName, this.dbVersion)

      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        this.db = request.result
        resolve()
      }

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result

        if (db.objectStoreNames.contains('pages')) {
          db.deleteObjectStore('pages')
        }

        // Create object stores for different data types
        if (!db.objectStoreNames.contains('classes')) {
          db.createObjectStore('classes', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('resources')) {
          db.createObjectStore('resources', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('messages')) {
          const messagesStore = db.createObjectStore('messages', { keyPath: 'id' })
          messagesStore.createIndex('senderId', 'senderId', { unique: false })
          messagesStore.createIndex('receiverId', 'receiverId', { unique: false })
        }
        if (!db.objectStoreNames.contains('notifications')) {
          db.createObjectStore('notifications', { keyPath: 'id' })
        }
        if (!db.objectStoreNames.contains('images')) {
          db.createObjectStore('images', { keyPath: 'url' })
        }
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'userId' })
        }
        if (!db.objectStoreNames.contains('classDetails')) {
          db.createObjectStore('classDetails', { keyPath: 'id' })
        }
      }
    })
  }

  private async ensureDB(): Promise<IDBDatabase> {
    if (!this.db) {
      await this.initDB()
    }
    if (!this.db) {
      throw new Error('Failed to initialize IndexedDB')
    }
    return this.db
  }

  private async getAll<T>(storeName: string): Promise<T[]> {
    try {
      const db = await this.ensureDB()
      if (!db.objectStoreNames.contains(storeName)) {
        return []
      }

      const tx = db.transaction(storeName, 'readonly')
      const store = tx.objectStore(storeName)
      const request = store.getAll()

      return await new Promise<T[]>((resolve, reject) => {
        request.onsuccess = () => resolve((request.result || []) as T[])
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error(`Failed to read cache store '${storeName}':`, error)
      return []
    }
  }

  // Cache classes - optimized with batching
  async cacheClasses(classes: any[]): Promise<void> {
    try {
      const db = await this.ensureDB()
      const tx = db.transaction('classes', 'readwrite')
      const store = tx.objectStore('classes')
      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => resolve()
        clearRequest.onerror = () => reject(clearRequest.error)
      })

      if (!classes || classes.length === 0) return
      
      // Batch operations for better performance
      const batchSize = 50
      for (let i = 0; i < classes.length; i += batchSize) {
        const batch = classes.slice(i, i + batchSize)
        await Promise.all(
          batch.map(cls => {
            if (!cls.id) return Promise.resolve()
            return new Promise<void>((resolve, reject) => {
              const request = store.put({ ...cls, cachedAt: Date.now() })
              request.onsuccess = () => resolve()
              request.onerror = () => reject(request.error)
            })
          })
        )
      }
    } catch (error) {
      console.error('Failed to cache classes:', error)
    }
  }

  async getCachedClasses(): Promise<any[]> {
    return this.getAll<any>('classes')
  }

  // Cache resources - optimized with batching
  async cacheResources(resources: any[]): Promise<void> {
    try {
      const db = await this.ensureDB()
      const tx = db.transaction('resources', 'readwrite')
      const store = tx.objectStore('resources')
      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => resolve()
        clearRequest.onerror = () => reject(clearRequest.error)
      })

      if (!resources || resources.length === 0) return
      
      // Batch operations for better performance
      const batchSize = 50
      for (let i = 0; i < resources.length; i += batchSize) {
        const batch = resources.slice(i, i + batchSize)
        await Promise.all(
          batch.map(res => {
            if (!res.id) return Promise.resolve()
            return new Promise<void>((resolve, reject) => {
              const request = store.put({ ...res, cachedAt: Date.now() })
              request.onsuccess = () => resolve()
              request.onerror = () => reject(request.error)
            })
          })
        )
      }
    } catch (error) {
      console.error('Failed to cache resources:', error)
    }
  }

  async getCachedResources(): Promise<any[]> {
    return this.getAll<any>('resources')
  }

  // Cache messages - optimized with batching and validation
  async cacheMessages(messages: any[]): Promise<void> {
    if (!messages || messages.length === 0) return
    
    try {
      const db = await this.ensureDB()
      const tx = db.transaction('messages', 'readwrite')
      const store = tx.objectStore('messages')
      
      // Filter out messages without id and add id if missing
      const messagesToCache = messages
        .filter(msg => {
          // If it's a conversation object, skip it (conversations don't have id)
          if (msg.userId && !msg.id) {
            return false
          }
          // Ensure id exists
          if (!msg.id) {
            msg.id = msg.senderId && msg.receiverId 
              ? `msg-${msg.senderId}-${msg.receiverId}-${Date.now()}`
              : `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }
          return true
        })
        .map(msg => ({ ...msg, cachedAt: Date.now() }))
      
      if (messagesToCache.length === 0) return
      
      // Batch operations for better performance
      const batchSize = 50
      for (let i = 0; i < messagesToCache.length; i += batchSize) {
        const batch = messagesToCache.slice(i, i + batchSize)
        await Promise.all(
          batch.map(msg => {
            return new Promise<void>((resolve, reject) => {
              const request = store.put(msg)
              request.onsuccess = () => resolve()
              request.onerror = () => reject(request.error)
            })
          })
        )
      }
    } catch (error) {
      console.error('Failed to cache messages:', error)
    }
  }

  async getCachedMessages(): Promise<any[]> {
    return this.getAll<any>('messages')
  }

  async getCachedMessagesForThread(currentUserId: string, otherUserId: string): Promise<any[]> {
    const messages = await this.getCachedMessages()

    return messages.filter((message) => {
      const senderId = message.senderId || message.sender_id
      const receiverId = message.receiverId || message.receiver_id

      return (
        (senderId === currentUserId && receiverId === otherUserId) ||
        (senderId === otherUserId && receiverId === currentUserId)
      )
    })
  }

  // Cache conversations (different from messages)
  async cacheConversations(conversations: any[]): Promise<void> {
    try {
      const db = await this.ensureDB()
      const tx = db.transaction('conversations', 'readwrite')
      const store = tx.objectStore('conversations')
      
      await Promise.all(conversations.map(conv => {
        // Ensure userId exists as key
        if (!conv.userId) return Promise.resolve()
        return new Promise<void>((resolve, reject) => {
          const request = store.put({ ...conv, cachedAt: Date.now() })
          request.onsuccess = () => resolve()
          request.onerror = () => reject(request.error)
        })
      }))
    } catch (error) {
      console.error('Failed to cache conversations:', error)
    }
  }

  async getCachedConversations(): Promise<any[]> {
    return this.getAll<any>('conversations')
  }

  // Cache notifications - optimized with batching
  async cacheNotifications(notifications: any[]): Promise<void> {
    try {
      const db = await this.ensureDB()
      const tx = db.transaction('notifications', 'readwrite')
      const store = tx.objectStore('notifications')
      await new Promise<void>((resolve, reject) => {
        const clearRequest = store.clear()
        clearRequest.onsuccess = () => resolve()
        clearRequest.onerror = () => reject(clearRequest.error)
      })

      if (!notifications || notifications.length === 0) return
      
      // Batch operations for better performance
      const batchSize = 50
      for (let i = 0; i < notifications.length; i += batchSize) {
        const batch = notifications.slice(i, i + batchSize)
        await Promise.all(
          batch.map(notif => {
            if (!notif.id) return Promise.resolve()
            return new Promise<void>((resolve, reject) => {
              const request = store.put({ ...notif, cachedAt: Date.now() })
              request.onsuccess = () => resolve()
              request.onerror = () => reject(request.error)
            })
          })
        )
      }
    } catch (error) {
      console.error('Failed to cache notifications:', error)
    }
  }

  async getCachedNotifications(): Promise<any[]> {
    return this.getAll<any>('notifications')
  }

  // Cache images
  async cacheImage(url: string, blob: Blob): Promise<void> {
    try {
      const db = await this.ensureDB()
      const tx = db.transaction('images', 'readwrite')
      const store = tx.objectStore('images')
      
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ url, blob, cachedAt: Date.now() })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to cache image:', error)
    }
  }

  async getCachedImage(url: string): Promise<Blob | null> {
    try {
      const db = await this.ensureDB()
      const tx = db.transaction('images', 'readonly')
      const store = tx.objectStore('images')
      const request = store.get(url)
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => {
          const result = request.result
          resolve(result ? result.blob : null)
        }
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get cached image:', error)
      return null
    }
  }

  // Cache class detail data
  async cacheClassDetail(classId: string, data: any): Promise<void> {
    try {
      const db = await this.ensureDB()
      
      // Check if store exists
      if (!db.objectStoreNames.contains('classDetails')) {
        console.warn('classDetails store does not exist, skipping cache')
        return
      }
      
      const tx = db.transaction('classDetails', 'readwrite')
      const store = tx.objectStore('classDetails')
      await new Promise<void>((resolve, reject) => {
        const request = store.put({ id: classId, ...data, cachedAt: Date.now() })
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to cache class detail:', error)
    }
  }

  async getCachedClassDetail(classId: string): Promise<any | null> {
    try {
      const db = await this.ensureDB()
      
      if (!db.objectStoreNames.contains('classDetails')) {
        return null
      }
      
      const tx = db.transaction('classDetails', 'readonly')
      const store = tx.objectStore('classDetails')
      const request = store.get(classId)
      
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result || null)
        request.onerror = () => reject(request.error)
      })
    } catch (error) {
      console.error('Failed to get cached class detail:', error)
      return null
    }
  }

  async getCachedClassDetails(): Promise<any[]> {
    return this.getAll<any>('classDetails')
  }

  // Clear old cache (older than 7 days)
  async clearOldCache(): Promise<void> {
    try {
      const db = await this.ensureDB()
      const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const stores = ['classes', 'resources', 'messages', 'notifications', 'images', 'conversations', 'classDetails']
      
      for (const storeName of stores) {
        // Check if store exists before trying to use it
        if (!db.objectStoreNames.contains(storeName)) {
          console.warn(`Object store '${storeName}' does not exist, skipping...`)
          continue
        }
        
        try {
          const tx = db.transaction(storeName, 'readwrite')
          const store = tx.objectStore(storeName)
          const request = store.openCursor()
          
          await new Promise<void>((resolve, reject) => {
            request.onsuccess = (event) => {
              const cursor = (event.target as IDBRequest<IDBCursorWithValue>).result
              if (cursor) {
                const data = cursor.value
                if (data.cachedAt && data.cachedAt < sevenDaysAgo) {
                  cursor.delete()
                }
                cursor.continue()
              } else {
                resolve()
              }
            }
            request.onerror = () => reject(request.error)
          })
        } catch (storeError) {
          console.error(`Failed to clear cache for store '${storeName}':`, storeError)
          // Continue with other stores
        }
      }
    } catch (error) {
      console.error('Failed to clear old cache:', error)
    }
  }

  async clearAllCache(): Promise<void> {
    try {
      const db = await this.ensureDB()
      const storeNames = Array.from(db.objectStoreNames)

      await Promise.all(
        storeNames.map(async (storeName) => {
          const tx = db.transaction(storeName, "readwrite")
          const store = tx.objectStore(storeName)
          const request = store.clear()

          await new Promise<void>((resolve, reject) => {
            request.onsuccess = () => resolve()
            request.onerror = () => reject(request.error)
          })
        }),
      )
    } catch (error) {
      console.error("Failed to clear all cache:", error)
      throw error
    }
  }
}
