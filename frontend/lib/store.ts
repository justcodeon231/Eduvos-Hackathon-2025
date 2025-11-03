"use client"

import { create } from "zustand"
import { persist } from "zustand/middleware"

interface AppState {
  selectedView: "home" | "idea-hub" | "collaboration-rooms" | "rewards" | "mentorship"
  setSelectedView: (view: AppState["selectedView"]) => void

  activeIdeaHubTab: "discovery" | "trending" | "recent"
  setActiveIdeaHubTab: (tab: AppState["activeIdeaHubTab"]) => void

  activeCollabCategory: string
  setActiveCollabCategory: (category: string) => void

  unreadNotifications: number
  setUnreadNotifications: (count: number) => void
}

export const useAppStore = create<AppState>()(
  persist(
    (set) => ({
      selectedView: "home",
      setSelectedView: (view) => set({ selectedView: view }),

      activeIdeaHubTab: "trending",
      setActiveIdeaHubTab: (tab) => set({ activeIdeaHubTab: tab }),

      activeCollabCategory: "General",
      setActiveCollabCategory: (category) => set({ activeCollabCategory: category }),

      unreadNotifications: 0,
      setUnreadNotifications: (count) => set({ unreadNotifications: count }),
    }),
    {
      name: "catalyst-app-storage",
    },
  ),
)
