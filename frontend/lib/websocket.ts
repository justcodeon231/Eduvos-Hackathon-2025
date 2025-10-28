import { authService } from "./auth"

const WS_BASE_URL = process.env.NEXT_PUBLIC_API_URL?.replace("http", "ws") || "ws://localhost:8000"

export type WebSocketMessage =
  | { type: "notification"; notification: any }
  | { type: "chat_message"; message: any }
  | { type: "forum_message"; message: any }
  | { type: "error"; message: string }

export class WebSocketService {
  private notificationWs: WebSocket | null = null
  private chatWs: WebSocket | null = null
  private forumWs: Map<string, WebSocket> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000

  // Notification WebSocket
  connectNotifications(userId: number, onMessage: (data: any) => void) {
    if (this.notificationWs?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/notifications/${userId}`)

    ws.onopen = () => {
      console.log("[v0] Notifications WebSocket connected")
      this.reconnectAttempts = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error("[v0] Failed to parse notification message:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("[v0] Notifications WebSocket error:", error)
    }

    ws.onclose = () => {
      console.log("[v0] Notifications WebSocket closed")
      this.notificationWs = null
      this.attemptReconnect(() => this.connectNotifications(userId, onMessage))
    }

    this.notificationWs = ws
  }

  disconnectNotifications() {
    if (this.notificationWs) {
      this.notificationWs.close()
      this.notificationWs = null
    }
  }

  markNotificationRead(notificationId: number) {
    if (this.notificationWs?.readyState === WebSocket.OPEN) {
      this.notificationWs.send(`mark_read:${notificationId}`)
    }
  }

  // Chat WebSocket
  connectChat(userId: number, onMessage: (data: any) => void) {
    if (this.chatWs?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/chat/${userId}`)

    ws.onopen = () => {
      console.log("[v0] Chat WebSocket connected")
      this.reconnectAttempts = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error("[v0] Failed to parse chat message:", error)
      }
    }

    ws.onerror = (error) => {
      console.error("[v0] Chat WebSocket error:", error)
    }

    ws.onclose = () => {
      console.log("[v0] Chat WebSocket closed")
      this.chatWs = null
      this.attemptReconnect(() => this.connectChat(userId, onMessage))
    }

    this.chatWs = ws
  }

  disconnectChat() {
    if (this.chatWs) {
      this.chatWs.close()
      this.chatWs = null
    }
  }

  sendChatMessage(recipientId: number, content: string) {
    if (this.chatWs?.readyState === WebSocket.OPEN) {
      this.chatWs.send(JSON.stringify({ recipient_id: recipientId, content }))
    } else {
      throw new Error("Chat WebSocket not connected")
    }
  }

  // Forum WebSocket
  connectForum(category: string, onMessage: (data: any) => void) {
    const existingWs = this.forumWs.get(category)
    if (existingWs?.readyState === WebSocket.OPEN) {
      return
    }

    const ws = new WebSocket(`${WS_BASE_URL}/ws/forum/${category}`)

    ws.onopen = () => {
      console.log(`[v0] Forum WebSocket connected for category: ${category}`)
      this.reconnectAttempts = 0
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data)
        onMessage(data)
      } catch (error) {
        console.error("[v0] Failed to parse forum message:", error)
      }
    }

    ws.onerror = (error) => {
      console.error(`[v0] Forum WebSocket error for ${category}:`, error)
    }

    ws.onclose = () => {
      console.log(`[v0] Forum WebSocket closed for category: ${category}`)
      this.forumWs.delete(category)
      this.attemptReconnect(() => this.connectForum(category, onMessage))
    }

    this.forumWs.set(category, ws)
  }

  disconnectForum(category: string) {
    const ws = this.forumWs.get(category)
    if (ws) {
      ws.close()
      this.forumWs.delete(category)
    }
  }

  sendForumMessage(category: string, content: string) {
    const ws = this.forumWs.get(category)
    const token = authService.getToken()

    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ content, token }))
    } else {
      throw new Error(`Forum WebSocket not connected for category: ${category}`)
    }
  }

  disconnectAll() {
    this.disconnectNotifications()
    this.disconnectChat()
    this.forumWs.forEach((ws, category) => this.disconnectForum(category))
  }

  private attemptReconnect(reconnectFn: () => void) {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)
      console.log(`[v0] Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
      setTimeout(reconnectFn, delay)
    } else {
      console.error("[v0] Max reconnect attempts reached")
    }
  }
}

export const wsService = new WebSocketService()

export const websocketService = wsService
