"use client"

import { useEffect, useState } from "react"
import { Bell, Heart, MessageCircle, Share2, CheckCheck } from "lucide-react"
import { api, type Notification } from "@/lib/api"
import { Button } from "@/components/ui/button"

interface RightSidebarProps {
  onUnreadCountChange: (count: number) => void
  refreshTrigger: number
}

export function RightSidebar({ onUnreadCountChange, refreshTrigger }: RightSidebarProps) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadNotifications()
  }, [refreshTrigger])

  useEffect(() => {
    const handleNewNotification = () => {
      loadNotifications()
    }

    window.addEventListener("newNotification" as any, handleNewNotification)
    return () => window.removeEventListener("newNotification" as any, handleNewNotification)
  }, [])

  const loadNotifications = async () => {
    try {
      const notifs = await api.getNotifications()
      setNotifications(notifs)
      const unreadCount = notifs.filter((n) => n.is_read === 0).length
      onUnreadCountChange(unreadCount)
    } catch (error) {
      console.error("[v0] Failed to load notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const markAsRead = async (notifId: number) => {
    try {
      await api.markNotificationRead(notifId)
      loadNotifications()
    } catch (error) {
      console.error("[v0] Failed to mark notification as read:", error)
    }
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "like":
        return <Heart className="h-4 w-4 text-[#FFB400]" />
      case "comment":
        return <MessageCircle className="h-4 w-4 text-[#FF5A5F]" />
      case "dm":
        return <MessageCircle className="h-4 w-4 text-[#005EB8]" />
      case "share_post":
        return <Share2 className="h-4 w-4 text-[#005EB8]" />
      default:
        return <Bell className="h-4 w-4 text-gray-500" />
    }
  }

  const getNotificationColor = (type: string) => {
    switch (type) {
      case "like":
        return "bg-[#FFB400]/10 border-[#FFB400]/20"
      case "comment":
        return "bg-[#FF5A5F]/10 border-[#FF5A5F]/20"
      case "dm":
      case "share_post":
        return "bg-[#005EB8]/10 border-[#005EB8]/20"
      default:
        return "bg-gray-50 border-gray-200"
    }
  }

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 1) return "Just now"
    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <aside className="w-80 bg-[#F4F8FB] border-l border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg text-[#111111] flex items-center gap-2">
          <Bell className="h-5 w-5 text-[#005EB8]" />
          Notifications
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-2" />
            <p>No notifications yet</p>
            <p className="text-sm mt-1">You'll see updates here</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {notifications.map((notif) => (
              <div
                key={notif.id}
                className={`p-4 hover:bg-white transition-colors ${notif.is_read === 0 ? "bg-white" : ""}`}
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-full ${getNotificationColor(notif.notification_type)}`}>
                    {getNotificationIcon(notif.notification_type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm leading-relaxed ${notif.is_read === 0 ? "font-medium" : ""}`}>
                      {notif.message}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">{formatTime(notif.created_at)}</p>
                    {notif.is_read === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notif.id)}
                        className="mt-2 h-7 text-xs text-[#005EB8] hover:text-[#003E73]"
                      >
                        <CheckCheck className="h-3 w-3 mr-1" />
                        Mark as read
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
