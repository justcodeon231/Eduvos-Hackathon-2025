"use client"

import { useState, useEffect } from "react"
import { Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { notificationsApi, type Notification } from "@/lib/api"

export function NotificationsDropdown() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [lastFetch, setLastFetch] = useState<string>(new Date().toISOString())

  useEffect(() => {
    loadNotifications()
    // Poll every 10 seconds
    const interval = setInterval(() => {
      loadNotifications(lastFetch)
    }, 10000)
    return () => clearInterval(interval)
  }, [])

  const loadNotifications = async (since?: string) => {
    try {
      const data = await notificationsApi.getNotifications(since)
      if (data.length > 0) {
        setNotifications((prev) => [...data, ...prev].slice(0, 20))
        setLastFetch(new Date().toISOString())
      }
      // Count unread
      const unread = notifications.filter((n) => n.is_read === 0).length
      setUnreadCount(unread)
    } catch (err) {
      console.error("[v0] Failed to load notifications:", err)
    }
  }

  const handleMarkAsRead = async (notificationId: number) => {
    try {
      await notificationsApi.markAsRead(notificationId)
      setNotifications((prev) => prev.map((n) => (n.id === notificationId ? { ...n, is_read: 1 } : n)))
      setUnreadCount((prev) => Math.max(0, prev - 1))
    } catch (err) {
      console.error("[v0] Failed to mark notification as read:", err)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <Badge className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs bg-destructive">
              {unreadCount > 9 ? "9+" : unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 max-h-96 overflow-y-auto">
        <div className="p-2 font-semibold border-b">Notifications</div>
        {notifications.length === 0 ? (
          <div className="p-4 text-center text-sm text-muted-foreground">No notifications yet</div>
        ) : (
          notifications.map((notification) => (
            <DropdownMenuItem
              key={notification.id}
              className={`p-3 cursor-pointer ${notification.is_read === 0 ? "bg-primary/5" : ""}`}
              onClick={() => handleMarkAsRead(notification.id)}
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{notification.message}</p>
                <p className="text-xs text-muted-foreground mt-1">
                  {new Date(notification.created_at).toLocaleString()}
                </p>
              </div>
            </DropdownMenuItem>
          ))
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
