import { authService } from "./auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface Author {
  id: number
  name: string
  email: string
}

export interface Post {
  id: number
  title: string
  content: string
  category: string
  likes: number
  comments: number
  author: Author
  created_at: string
}

export interface FeedPost {
  id: number
  title: string
  content: string
  category: string
  likes: number
  comments: number
  author: Author
  created_at: string
}

export interface Comment {
  id: number
  post_id: number
  user_id: number
  content: string
  created_at: string
  author_display: string
}

export interface CreatePostData {
  title: string
  content: string
  category: string
}

export interface CreateCommentData {
  post_id: number
  content: string
}

export interface UserProfile {
  id: number
  name: string
  email: string
}

export interface UpdateProfileData {
  name?: string
  email?: string
  password?: string
}

export interface DashboardResponse {
  user: {
    id: number
    email: string
    name: string
  }
  stats: {
    total_posts: number
    likes_received: number
    comments_received: number
    engagement_last_7_days: {
      likes: Array<{ date: string; count: number }>
      comments: Array<{ date: string; count: number }>
    }
    points: number
    rank: number
  }
}

export interface DashboardStats {
  user: {
    points: number
    rank: number
  }
  stats: {
    total_posts: number
    total_likes: number
    total_comments: number
    engagement_data: EngagementDataPoint[]
  }
}

export interface EngagementDataPoint {
  date: string
  likes: number
  comments: number
}

export interface Message {
  id: number
  conversation_id: number
  sender_id: number
  sender_name: string
  content: string
  created_at: string
  read: boolean
}

export interface Conversation {
  id: number
  participant_id: number
  participant_name: string
  participant_email: string
  last_message: string
  last_message_time: string
  unread_count: number
  starred: boolean
}

export interface CreateMessageData {
  conversation_id: number
  content: string
}

export interface Notification {
  id: number
  notification_type: string
  message: string
  actor_id: number | null
  post_id: number | null
  comment_id: number | null
  is_read: number
  created_at: string
}

export interface ForumMessage {
  id: number
  content: string
  author: Author
  created_at: string
}

export interface ChatMessage {
  id: number
  sender_id: number
  recipient_id: number
  content: string
  created_at: string
}

export interface LeaderboardEntry {
  user_id: number
  name: string
  points: number
}

export interface LeaderboardUser {
  id: number
  name: string
  email: string
  points: number
  post_count: number
  like_count: number
  comment_count: number
}

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const token = authService.getToken()

  const headers = {
    "Content-Type": "application/json",
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  }

  const response = await fetch(url, { ...options, headers })

  if (response.status === 401) {
    authService.logout()
    window.location.href = "/login"
    throw new Error("Unauthorized")
  }

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: "Request failed" }))
    throw new Error(error.detail || error.message || "Request failed")
  }

  return response.json()
}

export function getCategoryPlaceholder(category: string): string {
  const categoryImages: Record<string, string> = {
    "Ideas Hub": "/placeholder.svg?height=400&width=600",
    "Collaborate/Brainstorm": "/placeholder.svg?height=400&width=600",
    "Resources/Gamification": "/placeholder.svg?height=400&width=600",
    "Research Guardians": "/placeholder.svg?height=400&width=600",
    Forum: "/placeholder.svg?height=400&width=600",
    home: "/placeholder.svg?height=400&width=600",
  }
  return categoryImages[category] || "/placeholder.svg?height=400&width=600"
}

export const postsApi = {
  async getFeed(category?: string, offset = 0, limit = 10): Promise<FeedPost[]> {
    const params = new URLSearchParams({
      offset: offset.toString(),
      limit: limit.toString(),
      ...(category && category !== "home" && { category }),
    })
    return fetchWithAuth(`${API_BASE_URL}/feed?${params}`)
  },

  async getHighlights(): Promise<Post[]> {
    return fetchWithAuth(`${API_BASE_URL}/posts/highlights`)
  },

  async createPost(data: CreatePostData): Promise<Post> {
    return fetchWithAuth(`${API_BASE_URL}/post`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async likePost(postId: number): Promise<{ message: string }> {
    return fetchWithAuth(`${API_BASE_URL}/posts/${postId}/like`, {
      method: "POST",
    })
  },

  async getComments(postId: number): Promise<Comment[]> {
    return fetchWithAuth(`${API_BASE_URL}/posts/${postId}/comments`)
  },

  async createComment(data: CreateCommentData): Promise<Comment> {
    return fetchWithAuth(`${API_BASE_URL}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async deleteComment(commentId: number): Promise<{ message: string }> {
    return fetchWithAuth(`${API_BASE_URL}/comments/${commentId}`, {
      method: "DELETE",
    })
  },
}

export const profileApi = {
  async getProfile(): Promise<UserProfile> {
    return fetchWithAuth(`${API_BASE_URL}/profile`)
  },

  async updateProfile(data: UpdateProfileData): Promise<UserProfile> {
    return fetchWithAuth(`${API_BASE_URL}/profile`, {
      method: "PUT",
      body: JSON.stringify(data),
    })
  },
}

export const dashboardApi = {
  async getStats(): Promise<DashboardStats> {
    const response: DashboardResponse = await fetchWithAuth(`${API_BASE_URL}/dashboard`)

    // Transform backend response to frontend format
    const engagementMap = new Map<string, { likes: number; comments: number }>()

    // Merge likes and comments by date
    response.stats.engagement_last_7_days.likes.forEach(({ date, count }) => {
      engagementMap.set(date, { likes: count, comments: 0 })
    })

    response.stats.engagement_last_7_days.comments.forEach(({ date, count }) => {
      const existing = engagementMap.get(date) || { likes: 0, comments: 0 }
      engagementMap.set(date, { ...existing, comments: count })
    })

    const engagementData = Array.from(engagementMap.entries())
      .map(([date, data]) => ({ date, ...data }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return {
      user: {
        points: response.stats.points,
        rank: response.stats.rank,
      },
      stats: {
        total_posts: response.stats.total_posts,
        total_likes: response.stats.likes_received,
        total_comments: response.stats.comments_received,
        engagement_data: engagementData,
      },
    }
  },
}

export const messagesApi = {
  async getConversations(): Promise<Conversation[]> {
    return fetchWithAuth(`${API_BASE_URL}/conversations`)
  },

  async getMessages(conversationId: number): Promise<Message[]> {
    return fetchWithAuth(`${API_BASE_URL}/conversations/${conversationId}/messages`)
  },

  async sendMessage(data: CreateMessageData): Promise<Message> {
    return fetchWithAuth(`${API_BASE_URL}/messages`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async toggleStar(conversationId: number): Promise<{ starred: boolean }> {
    return fetchWithAuth(`${API_BASE_URL}/conversations/${conversationId}/star`, {
      method: "POST",
    })
  },

  async markAsRead(conversationId: number): Promise<{ message: string }> {
    return fetchWithAuth(`${API_BASE_URL}/conversations/${conversationId}/read`, {
      method: "POST",
    })
  },
}

export const notificationsApi = {
  async getNotifications(since?: string): Promise<Notification[]> {
    const params = since ? `?since=${encodeURIComponent(since)}` : ""
    return fetchWithAuth(`${API_BASE_URL}/notifications${params}`)
  },

  async markAsRead(notificationId: number): Promise<{ message: string }> {
    return fetchWithAuth(`${API_BASE_URL}/notifications/${notificationId}/read`, {
      method: "PATCH",
    })
  },
}

export const forumApi = {
  async getMessages(category = "general"): Promise<ForumMessage[]> {
    return fetchWithAuth(`${API_BASE_URL}/forum/messages?category=${category}`)
  },

  async postMessage(content: string, category = "general"): Promise<ForumMessage> {
    return fetchWithAuth(`${API_BASE_URL}/forum/post`, {
      method: "POST",
      body: JSON.stringify({ content, category }),
    })
  },
}

export const chatApi = {
  async sendMessage(recipientId: number, content: string): Promise<ChatMessage> {
    return fetchWithAuth(`${API_BASE_URL}/chat/send`, {
      method: "POST",
      body: JSON.stringify({ recipient_id: recipientId, content }),
    })
  },

  async getHistory(otherUserId: number): Promise<ChatMessage[]> {
    return fetchWithAuth(`${API_BASE_URL}/chat/history/${otherUserId}`)
  },
}

export const leaderboardApi = {
  async getLeaderboard(limit = 10): Promise<LeaderboardUser[]> {
    return fetchWithAuth(`${API_BASE_URL}/leaderboard?limit=${limit}`)
  },
}
