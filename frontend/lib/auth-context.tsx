"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import { api, type User } from "./api"

interface AuthContextType {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  register: (email: string, name: string, password: string) => Promise<void>
  logout: () => void
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem("token")
      if (token) {
        try {
          const profile = await api.getProfile()
          setUser(profile)
        } catch (error) {
          console.error("[v0] Failed to load profile:", error)
          api.clearToken()
        }
      }
      setLoading(false)
    }

    initAuth()
  }, [])

  const login = async (email: string, password: string) => {
    const response = await api.login(email, password)
    api.setToken(response.access_token)
    const profile = await api.getProfile()
    setUser(profile)
  }

  const register = async (email: string, name: string, password: string) => {
    await api.register(email, name, password)
    await login(email, password)
  }

  const logout = () => {
    api.clearToken()
    setUser(null)
  }

  const refreshUser = async () => {
    if (user) {
      const profile = await api.getProfile()
      setUser(profile)
    }
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
