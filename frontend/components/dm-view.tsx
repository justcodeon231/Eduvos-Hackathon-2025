"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Send } from "lucide-react"
import { api, type ChatMessage } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MessageSquare } from "lucide-react"

interface DMViewProps {
  selectedUserId: number | null
  selectedUserName: string | null
  onRefreshNotifications: () => void
}

export function DMView({ selectedUserId, selectedUserName, onRefreshNotifications }: DMViewProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (selectedUserId) {
      loadMessages()
    }
  }, [selectedUserId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const handleNewMessage = (event: CustomEvent) => {
      const data = event.detail
      if (data.sender_id === selectedUserId || data.recipient_id === selectedUserId) {
        loadMessages()
        onRefreshNotifications()
      }
    }

    window.addEventListener("newChatMessage" as any, handleNewMessage)
    return () => window.removeEventListener("newChatMessage" as any, handleNewMessage)
  }, [selectedUserId])

  const loadMessages = async () => {
    if (!selectedUserId) return

    try {
      const history = await api.getChatHistory(selectedUserId)
      setMessages(history)
    } catch (error) {
      console.error("[v0] Failed to load messages:", error)
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim() || !selectedUserId || loading) return

    setLoading(true)
    try {
      const message = await api.sendMessage(selectedUserId, newMessage)
      setMessages([...messages, message])
      setNewMessage("")
      onRefreshNotifications()
      window.dispatchEvent(new CustomEvent("refreshConnections"))
    } catch (error) {
      console.error("[v0] Failed to send message:", error)
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  }

  if (!selectedUserId) {
    return (
      <div className="flex items-center justify-center h-full bg-[#F9FAFB]">
        <div className="text-center">
          <MessageSquare className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <p className="text-lg font-medium text-gray-600">Select a connection to start chatting</p>
          <p className="text-sm text-gray-500 mt-2">Choose someone from your connections or search for users</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-[#005EB8] text-white">
              {selectedUserName ? getInitials(selectedUserName) : "U"}
            </AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-semibold text-[#111111]">{selectedUserName}</h3>
            <p className="text-sm text-gray-500">Active now</p>
          </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F9FAFB]">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>No messages yet. Start the conversation!</p>
          </div>
        ) : (
          messages.map((message) => {
            const isOwn = message.sender_id === user?.id
            return (
              <div key={message.id} className={`flex gap-3 ${isOwn ? "flex-row-reverse" : ""}`}>
                <Avatar className="h-8 w-8 flex-shrink-0">
                  <AvatarFallback className={isOwn ? "bg-[#005EB8] text-white" : "bg-gray-300 text-gray-700"}>
                    {isOwn ? getInitials(user?.name || "") : getInitials(selectedUserName || "")}
                  </AvatarFallback>
                </Avatar>
                <div className={`flex flex-col ${isOwn ? "items-end" : "items-start"} max-w-[70%]`}>
                  <div
                    className={`rounded-lg px-4 py-2 ${
                      isOwn ? "bg-[#005EB8] text-white" : "bg-white text-[#111111] border border-gray-200"
                    }`}
                  >
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  </div>
                  <span className="text-xs text-gray-500 mt-1">{formatTime(message.created_at)}</span>
                </div>
              </div>
            )
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t border-gray-200 bg-white">
        <form onSubmit={handleSend} className="flex gap-2">
          <Input
            type="text"
            placeholder="Type a message..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            className="flex-1"
            disabled={loading}
          />
          <Button
            type="submit"
            disabled={!newMessage.trim() || loading}
            className="bg-[#005EB8] hover:bg-[#003E73] text-white"
          >
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  )
}
