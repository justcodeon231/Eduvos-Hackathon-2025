"use client"

import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"

const notifications = [
  {
    id: 1,
    user: "Thando Nkosi",
    action: "added a new idea to the Innovation Hub",
    time: "2h ago",
    avatar: "/placeholder.svg?height=32&width=32",
    unread: true,
  },
  {
    id: 2,
    user: "Zanele Khumalo",
    action: "commented on your post: 'Great insights on AI implementation...'",
    time: "4h ago",
    avatar: "/placeholder.svg?height=32&width=32",
    unread: true,
  },
  {
    id: 3,
    user: "Sipho Mahlangu",
    action: "liked your idea: 'Smart Campus Energy Optimizer'",
    time: "6h ago",
    avatar: "/placeholder.svg?height=32&width=32",
    unread: false,
  },
  {
    id: 4,
    user: "Nomsa Dube",
    action: "shared your project with their team",
    time: "1d ago",
    avatar: "/placeholder.svg?height=32&width=32",
    unread: false,
  },
]

export function NotificationsSidebar() {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Notifications</h2>
        <Badge variant="secondary" className="rounded-full">
          {notifications.filter((n) => n.unread).length}
        </Badge>
      </div>

      <div className="space-y-4">
        {notifications.map((notification) => (
          <div key={notification.id} className="flex items-start gap-3 group">
            <Avatar className="w-8 h-8">
              <AvatarImage src={notification.avatar || "/placeholder.svg"} />
              <AvatarFallback>{notification.user[0]}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{notification.user}</span>{" "}
                <span className="text-muted-foreground">{notification.action}</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{notification.time}</p>
            </div>
            {notification.unread && <div className="w-2 h-2 bg-primary rounded-full mt-2" />}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <MoreHorizontal className="w-4 h-4" />
            </Button>
          </div>
        ))}
      </div>
    </Card>
  )
}
