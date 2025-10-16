export interface User {
  id: string
  name: string
  email: string
}

export interface AuthResponse {
  token: string
  user: User
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export const authService = {
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Login failed")
    }

    return response.json()
  },

  async register(name: string, email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.message || "Registration failed")
    }

    return response.json()
  },

  getToken(): string | null {
    if (typeof window === "undefined") return null
    return localStorage.getItem("auth_token")
  },

  setToken(token: string): void {
    localStorage.setItem("auth_token", token)
  },

  removeToken(): void {
    localStorage.removeItem("auth_token")
  },

  getUser(): User | null {
    if (typeof window === "undefined") return null
    const userStr = localStorage.getItem("auth_user")
    return userStr ? JSON.parse(userStr) : null
  },

  setUser(user: User): void {
    localStorage.setItem("auth_user", JSON.stringify(user))
  },

  removeUser(): void {
    localStorage.removeItem("auth_user")
  },

  logout(): void {
    this.removeToken()
    this.removeUser()
  },

  isAuthenticated(): boolean {
    return !!this.getToken()
  },
}
