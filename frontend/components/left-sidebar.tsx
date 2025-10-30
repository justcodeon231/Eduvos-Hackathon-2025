"use client"

import { useEffect, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api, type User } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { MessageSquare } from "lucide-react"

interface Connection {
  user: User
  lastMessage: string
  lastMessageTime: string
}

interface LeftSidebarProps {
  onSelectUser: (userId: number, userName: string) => void
  selectedUserId: number | null
}

export function LeftSidebar({ onSelectUser, selectedUserId }: LeftSidebarProps) {
  const { user: currentUser } = useAuth()
  const [connections, setConnections] = useState<Connection[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadConnections()
  }, [])

  const loadConnections = async () => {
    try {
      // Get all users and their last messages
      const users = await api.searchUsers("")
      const connectionsData: Connection[] = []

      for (const user of users) {
        if (user.id === currentUser?.id) continue

        try {
          const messages = await api.getChatHistory(user.id)
          const lastMsg = messages[messages.length - 1]

          connectionsData.push({
            user,
            lastMessage: lastMsg ? lastMsg.content : "No messages yet",
            lastMessageTime: lastMsg
              ? new Date(lastMsg.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
              : "",
          })
        } catch (error) {
          // No messages with this user yet
          connectionsData.push({
            user,
            lastMessage: "Start a conversation",
            lastMessageTime: "",
          })
        }
      }

      setConnections(connectionsData)
    } catch (error) {
      console.error("[v0] Failed to load connections:", error)
    } finally {
      setLoading(false)
    }
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  // Listen for new connections from search
  useEffect(() => {
    const handleNewConnection = () => {
      loadConnections()
    }

    window.addEventListener("refreshConnections" as any, handleNewConnection)
    return () => window.removeEventListener("refreshConnections" as any, handleNewConnection)
  }, [])

  return (
    <aside className="w-80 bg-[#F4F8FB] border-r border-gray-200 flex flex-col h-full">
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-lg text-[#111111] flex items-center gap-2">
          <MessageSquare className="h-5 w-5 text-[#005EB8]" />
          Connections
        </h2>
      </div>

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="p-4 text-center text-muted-foreground">Loading connections...</div>
        ) : connections.length === 0 ? (
          <div className="p-4 text-center text-muted-foreground">
            <p>No connections yet</p>
            <p className="text-sm mt-2">Search for users to start chatting</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {connections.map((connection) => (
              <button
                key={connection.user.id}
                onClick={() => {
                  onSelectUser(connection.user.id, connection.user.name)
                }}
                className={`w-full flex items-start gap-3 p-4 hover:bg-[#CCE5FF] transition-colors text-left ${
                  selectedUserId === connection.user.id ? "bg-[#CCE5FF]" : ""
                }`}
              >
                <Avatar className="h-12 w-12 flex-shrink-0">
                  <AvatarFallback className="bg-[#005EB8] text-white">
                    {getInitials(connection.user.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-[#111111] truncate">{connection.user.name}</p>
                    {connection.lastMessageTime && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">{connection.lastMessageTime}</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 truncate">{connection.lastMessage}</p>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  )
}
