"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { TopBar } from "@/components/top-bar"
import { LeftSidebar } from "@/components/left-sidebar"
import { MainPanel } from "@/components/main-panel"
import { RightSidebar } from "@/components/right-sidebar"
import { ProfileSettingsModal } from "@/components/profile-settings-modal"
import { SharePostModal } from "@/components/share-post-modal"
import { wsManager } from "@/lib/websocket"
import type { Post } from "@/lib/api"

export default function DashboardPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [selectedUserName, setSelectedUserName] = useState<string | null>(null)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notificationRefresh, setNotificationRefresh] = useState(0)
  const [showProfileSettings, setShowProfileSettings] = useState(false)
  const [showSharePost, setShowSharePost] = useState(false)
  const [postToShare, setPostToShare] = useState<Post | null>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      wsManager.connect(user.id)
    }

    return () => {
      wsManager.disconnect()
    }
  }, [user])

  useEffect(() => {
    const handleOpenChat = (event: CustomEvent) => {
      setSelectedUserId(event.detail.userId)
      setSelectedUserName(event.detail.userName)
    }

    const handleOpenProfileSettings = () => {
      setShowProfileSettings(true)
    }

    const handleSharePost = (event: CustomEvent) => {
      setPostToShare(event.detail.post)
      setShowSharePost(true)
    }

    window.addEventListener("openChat" as any, handleOpenChat)
    window.addEventListener("openProfileSettings" as any, handleOpenProfileSettings)
    window.addEventListener("sharePost" as any, handleSharePost)

    return () => {
      window.removeEventListener("openChat" as any, handleOpenChat)
      window.removeEventListener("openProfileSettings" as any, handleOpenProfileSettings)
      window.removeEventListener("sharePost" as any, handleSharePost)
    }
  }, [])

  const handleRefreshNotifications = () => {
    setNotificationRefresh((prev) => prev + 1)
  }

  const handleNotificationClick = () => {
    // Scroll to notifications or highlight them
    console.log("[v0] Notification bell clicked")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TopBar onNotificationClick={handleNotificationClick} unreadCount={unreadCount} />

      <div className="flex flex-1 overflow-hidden">
        <LeftSidebar onSelectUser={setSelectedUserId} selectedUserId={selectedUserId} />

        <MainPanel
          selectedUserId={selectedUserId}
          selectedUserName={selectedUserName}
          onRefreshNotifications={handleRefreshNotifications}
        />

        <RightSidebar onUnreadCountChange={setUnreadCount} refreshTrigger={notificationRefresh} />
      </div>

      <ProfileSettingsModal open={showProfileSettings} onClose={() => setShowProfileSettings(false)} />

      <SharePostModal
        open={showSharePost}
        onClose={() => {
          setShowSharePost(false)
          setPostToShare(null)
        }}
        post={postToShare}
        onSuccess={handleRefreshNotifications}
      />
    </div>
  )
}
