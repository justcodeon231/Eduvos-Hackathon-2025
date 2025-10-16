import { authService } from "./auth"

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export interface Post {
  id: string
  userId: string
  userName: string
  userAvatar?: string
  title: string
  content: string
  category: string
  tags: string[]
  likes: number
  comments: number
  isLiked: boolean
  createdAt: string
}

export interface Comment {
  id: string
  postId: string
  userId: string
  userName: string
  userAvatar?: string
  content: string
  createdAt: string
}

export interface CreatePostData {
  title: string
  content: string
  category: string
  tags: string[]
}

export interface CreateCommentData {
  postId: string
  content: string
}

// Added profile types
export interface UserProfile {
  id: string
  name: string
  email: string
  avatar?: string
  bio?: string
  createdAt: string
}

export interface UpdateProfileData {
  name?: string
  email?: string
  password?: string
  bio?: string
}

export interface DashboardStats {
  totalPosts: number
  totalLikes: number
  totalComments: number
  engagementData: EngagementDataPoint[]
}

export interface EngagementDataPoint {
  date: string
  likes: number
  comments: number
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
    const error = await response.json().catch(() => ({ message: "Request failed" }))
    throw new Error(error.message || "Request failed")
  }

  return response.json()
}

export const postsApi = {
  async getFeed(category?: string, offset = 0, limit = 10): Promise<Post[]> {
    const params = new URLSearchParams({
      offset: offset.toString(),
      limit: limit.toString(),
      ...(category && { category }),
    })
    return fetchWithAuth(`${API_BASE_URL}/feed?${params}`)
  },

  async createPost(data: CreatePostData): Promise<Post> {
    return fetchWithAuth(`${API_BASE_URL}/posts`, {
      method: "POST",
      body: JSON.stringify(data),
    })
  },

  async likePost(postId: string): Promise<void> {
    return fetchWithAuth(`${API_BASE_URL}/posts/${postId}/like`, {
      method: "POST",
    })
  },

  async unlikePost(postId: string): Promise<void> {
    return fetchWithAuth(`${API_BASE_URL}/posts/${postId}/like`, {
      method: "DELETE",
    })
  },

  async getComments(postId: string): Promise<Comment[]> {
    return fetchWithAuth(`${API_BASE_URL}/posts/${postId}/comments`)
  },

  async createComment(data: CreateCommentData): Promise<Comment> {
    return fetchWithAuth(`${API_BASE_URL}/comments`, {
      method: "POST",
      body: JSON.stringify(data),
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
    return fetchWithAuth(`${API_BASE_URL}/dashboard`)
  },
}
