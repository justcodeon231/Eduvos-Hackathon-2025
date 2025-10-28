"use client"

import { useState, useEffect } from "react"
import { Bell, Heart, MessageCircle, Mail } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { notificationsApi, type Notification } from "@/lib/api"
import { websocketService } from "@/lib/websocket"
import { useAuth } from "@/contexts/auth-context"

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    loadNotifications()

    // Connect to WebSocket for real-time notifications
    websocketService.connectNotifications(user.id, (notification) => {
      setNotifications((prev) => [notification, ...prev].slice(0, 20))
      setUnreadCount((prev) => prev + 1)
    })

    return () => {
      websocketService.disconnectNotifications()
    }
  }, [user])

  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications()
      setNotifications(data)
      const unread = data.filter((n) => n.is_read === 0).length
      setUnreadCount(unread)
    } catch (err) {
      console.error("Failed to load notifications:", err)
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId)
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: 1 } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
    }
  }

  const getNotificationIcon = (message: string) => {
    if (message.includes("liked")) return <Heart className="w-4 h-4 text-pink-500" />
    if (message.includes("commented")) return <MessageCircle className="w-4 h-4 text-blue-500" />
    if (message.includes("message")) return <Mail className="w-4 h-4 text-purple-500" />
    return <Bell className="w-4 h-4 text-gray-500" />
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative hover:bg-primary/10 transition-all">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-gradient-to-r from-pink-500 to-red-500 border-0 animate-pulse">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="p-3 font-semibold border-b bg-gradient-to-r from-primary/10 to-primary/5">
          Notifications
          {unreadCount > 0 && <span className="ml-2 text-xs text-muted-foreground">({unreadCount} new)</span>}
        </div>
        {notifications.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <Bell className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`p-3 cursor-pointer transition-all hover:bg-primary/5 ${
                notification.is_read === 0 ? "bg-primary/10 border-l-2 border-primary" : ""
              }`}
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <div className="flex gap-3 items-start">
                <div className="mt-1">{getNotificationIcon(notification.message)}</div>
                <div className="flex-1">
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(notification.created_at).toLocaleString()}
                  </p>
                </div>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
