import { create } from "zustand"

type Conversation = {
  userId: string
  userName: string
  userImage: string | null
  lastMessage: string
  lastMessageTime: string
  unreadCount: number
}

type MediaFile = {
  url: string
  type: string
  name: string
  size?: string
}

type MessageData = {
  id: string
  senderId: string
  receiverId: string
  content: string
  media: MediaFile[] | null
  url: string | null
  read: boolean
  createdAt: string
}

type UserPresence = {
  userId: string
  isOnline: boolean
  lastSeen: string | null
}

type MessagesState = {
  conversations: Conversation[]
  currentMessages: MessageData[]
  currentUserId: string | null
  currentOtherUser: {
    id: string
    name: string
    image: string | null
    email: string
  } | null
  userPresences: Map<string, UserPresence>
  setConversations: (conversations: Conversation[]) => void
  setCurrentMessages: (messages: MessageData[]) => void
  setCurrentUserId: (userId: string | null) => void
  setCurrentOtherUser: (user: {
    id: string
    name: string
    image: string | null
    email: string
  } | null) => void
  setUserPresence: (userId: string, isOnline: boolean, lastSeen?: string | null) => void
  getUserPresence: (userId: string) => UserPresence | null
  addMessage: (message: MessageData) => void
  updateMessage: (messageId: string, updates: Partial<MessageData>) => void
  updateConversation: (userId: string, updates: Partial<Conversation>) => void
  clearMessages: () => void
}

export const useMessagesStore = create<MessagesState>((set, get) => ({
  conversations: [],
  currentMessages: [],
  currentUserId: null,
  currentOtherUser: null,
  userPresences: new Map<string, UserPresence>(),
  setConversations: (conversations) => set({ conversations }),
  setCurrentMessages: (messages) => set({ currentMessages: messages }),
  setCurrentUserId: (userId) => set({ currentUserId: userId }),
  setCurrentOtherUser: (user) => set({ currentOtherUser: user }),
  setUserPresence: (userId, isOnline, lastSeen = null) =>
    set((state) => {
      const newPresences = new Map(state.userPresences)
      newPresences.set(userId, {
        userId,
        isOnline,
        lastSeen: lastSeen || (isOnline ? null : new Date().toISOString()),
      })
      return { userPresences: newPresences }
    }),
  getUserPresence: (userId) => {
    const state = get()
    return state.userPresences.get(userId) || null
  },
  addMessage: (message) =>
    set((state) => ({
      currentMessages: [...state.currentMessages, message],
    })),
  updateMessage: (messageId, updates) =>
    set((state) => ({
      currentMessages: state.currentMessages.map((m) =>
        m.id === messageId ? { ...m, ...updates } : m,
      ),
    })),
  updateConversation: (userId, updates) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.userId === userId ? { ...c, ...updates } : c,
      ),
    })),
  clearMessages: () =>
    set({
      conversations: [],
      currentMessages: [],
      currentUserId: null,
      currentOtherUser: null,
      userPresences: new Map(),
    }),
}))
