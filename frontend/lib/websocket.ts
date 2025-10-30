const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_URL || "ws://127.0.0.1:8000"

export class WebSocketManager {
  private chatSocket: WebSocket | null = null
  private notificationSocket: WebSocket | null = null
  private userId: number | null = null
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 3000

  constructor() {}

  connect(userId: number) {
    this.userId = userId
    this.connectChat()
    this.connectNotifications()
  }

  private connectChat() {
    if (!this.userId) return

    try {
      this.chatSocket = new WebSocket(`${WS_BASE_URL}/ws/chat/${this.userId}`)

      this.chatSocket.onopen = () => {
        console.log("[v0] Chat WebSocket connected")
        this.reconnectAttempts = 0
      }

      this.chatSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          window.dispatchEvent(new CustomEvent("newChatMessage", { detail: data }))
        } catch (error) {
          console.error("[v0] Failed to parse chat message:", error)
        }
      }

      this.chatSocket.onerror = (error) => {
        console.error("[v0] Chat WebSocket error:", error)
      }

      this.chatSocket.onclose = () => {
        console.log("[v0] Chat WebSocket disconnected")
        this.attemptReconnect("chat")
      }
    } catch (error) {
      console.error("[v0] Failed to connect chat WebSocket:", error)
    }
  }

  private connectNotifications() {
    if (!this.userId) return

    try {
      this.notificationSocket = new WebSocket(`${WS_BASE_URL}/ws/notifications/${this.userId}`)

      this.notificationSocket.onopen = () => {
        console.log("[v0] Notification WebSocket connected")
        this.reconnectAttempts = 0
      }

      this.notificationSocket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          window.dispatchEvent(new CustomEvent("newNotification", { detail: data }))
        } catch (error) {
          console.error("[v0] Failed to parse notification:", error)
        }
      }

      this.notificationSocket.onerror = (error) => {
        console.error("[v0] Notification WebSocket error:", error)
      }

      this.notificationSocket.onclose = () => {
        console.log("[v0] Notification WebSocket disconnected")
        this.attemptReconnect("notification")
      }
    } catch (error) {
      console.error("[v0] Failed to connect notification WebSocket:", error)
    }
  }

  private attemptReconnect(type: "chat" | "notification") {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.log(`[v0] Max reconnect attempts reached for ${type}`)
      return
    }

    this.reconnectAttempts++
    console.log(`[v0] Attempting to reconnect ${type} (${this.reconnectAttempts}/${this.maxReconnectAttempts})`)

    setTimeout(() => {
      if (type === "chat") {
        this.connectChat()
      } else {
        this.connectNotifications()
      }
    }, this.reconnectDelay)
  }

  disconnect() {
    if (this.chatSocket) {
      this.chatSocket.close()
      this.chatSocket = null
    }
    if (this.notificationSocket) {
      this.notificationSocket.close()
      this.notificationSocket = null
    }
    this.userId = null
    this.reconnectAttempts = 0
  }

  isConnected(): boolean {
    return this.chatSocket?.readyState === WebSocket.OPEN && this.notificationSocket?.readyState === WebSocket.OPEN
  }
}

export const wsManager = new WebSocketManager()
