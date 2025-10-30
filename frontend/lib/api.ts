const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000"

export interface User {
  id: number
  email: string
  name: string
}

export interface Post {
  id: number
  title: string
  content: string
  category: string
  likes: number
  comments: number
  author: User
  created_at: string
}

export interface ChatMessage {
  id: number
  sender_id: number
  recipient_id: number
  content: string
  created_at: string
}

export interface Notification {
  id: number
  notification_type: string
  message: string
  actor_id: number | null
  is_read: number
  created_at: string
}

export interface Connection {
  user: User
  last_message: string
  last_message_time: string
}

class ApiClient {
  private token: string | null = null

  constructor() {
    if (typeof window !== "undefined") {
      this.token = localStorage.getItem("token")
    }
  }

  setToken(token: string) {
    this.token = token
    if (typeof window !== "undefined") {
      localStorage.setItem("token", token)
    }
  }

  clearToken() {
    this.token = null
    if (typeof window !== "undefined") {
      localStorage.removeItem("token")
    }
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      ...options.headers,
    }

    if (this.token) {
      headers["Authorization"] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: "Request failed" }))
      throw new Error(error.detail || "Request failed")
    }

    return response.json()
  }

  // Auth
  async register(email: string, name: string, password: string): Promise<User> {
    return this.request<User>("/register", {
      method: "POST",
      body: JSON.stringify({ email, name, password }),
    })
  }

  async login(email: string, password: string): Promise<{ access_token: string; token_type: string }> {
    return this.request<{ access_token: string; token_type: string }>("/login", {
      method: "POST",
      body: JSON.stringify({ email, name: "", password }),
    })
  }

  // Profile
  async getProfile(): Promise<User> {
    return this.request<User>("/profile")
  }

  async updateProfile(name: string): Promise<User> {
    return this.request<User>(`/profile?name=${encodeURIComponent(name)}`, {
      method: "PUT",
    })
  }

  async deleteProfile(): Promise<{ detail: string }> {
    return this.request<{ detail: string }>("/profile", {
      method: "DELETE",
    })
  }

  // Posts
  async getPosts(): Promise<Post[]> {
    return this.request<Post[]>("/posts")
  }

  async createPost(title: string, content: string, category?: string): Promise<Post> {
    return this.request<Post>("/post", {
      method: "POST",
      body: JSON.stringify({ title, content, category: category || "general" }),
    })
  }

  async likePost(postId: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/posts/${postId}/like`, {
      method: "POST",
    })
  }

  async searchPosts(query: string): Promise<Post[]> {
    return this.request<Post[]>(`/posts/search?query=${encodeURIComponent(query)}`)
  }

  // Comments
  async createComment(postId: number, content: string): Promise<{ detail: string }> {
    return this.request<{ detail: string }>("/comments", {
      method: "POST",
      body: JSON.stringify({ post_id: postId, content }),
    })
  }

  // Chat
  async sendMessage(recipientId: number, content: string): Promise<ChatMessage> {
    return this.request<ChatMessage>("/chat/send", {
      method: "POST",
      body: JSON.stringify({ recipient_id: recipientId, content }),
    })
  }

  async getChatHistory(userId: number): Promise<ChatMessage[]> {
    return this.request<ChatMessage[]>(`/chat/history/${userId}`)
  }

  async sharePost(recipientId: number, postId: number, message?: string): Promise<ChatMessage> {
    return this.request<ChatMessage>("/chat/share-post", {
      method: "POST",
      body: JSON.stringify({ recipient_id: recipientId, post_id: postId, message }),
    })
  }

  // Notifications
  async getNotifications(): Promise<Notification[]> {
    return this.request<Notification[]>("/notifications")
  }

  async markNotificationRead(notifId: number): Promise<{ detail: string }> {
    return this.request<{ detail: string }>(`/notifications/${notifId}/read`, {
      method: "POST",
    })
  }

  // Search
  async searchUsers(query: string): Promise<User[]> {
    return this.request<User[]>(`/users/search?query=${encodeURIComponent(query)}`)
  }

  // Dashboard
  async getDashboard(): Promise<any> {
    return this.request<any>("/dashboard")
  }

  // Leaderboard
  async getLeaderboard(): Promise<any[]> {
    return this.request<any[]>("/leaderboard")
  }
}

export const api = new ApiClient()
