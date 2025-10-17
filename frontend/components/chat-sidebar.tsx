"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { X, Star, Send, Bold, Italic, LinkIcon, Smile } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { messagesApi, type Conversation, type Message } from "@/lib/api"

interface ChatSidebarProps {
  isOpen: boolean
  onClose: () => void
}

export function ChatSidebar({ isOpen, onClose }: ChatSidebarProps) {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadConversations()
    }
  }, [isOpen])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await messagesApi.getConversations()
      setConversations(data)
    } catch (error) {
      console.error("Failed to load conversations:", error)
    } finally {
      setLoading(false)
    }
  }

  const loadMessages = async (conversationId: number) => {
    try {
      const data = await messagesApi.getMessages(conversationId)
      setMessages(data)
      await messagesApi.markAsRead(conversationId)
      // Update unread count in conversations list
      setConversations((prev) => prev.map((conv) => (conv.id === conversationId ? { ...conv, unread_count: 0 } : conv)))
    } catch (error) {
      console.error("Failed to load messages:", error)
    }
  }

  const handleSelectConversation = (conversationId: number) => {
    setSelectedConversation(conversationId)
    loadMessages(conversationId)
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return

    try {
      await messagesApi.sendMessage({
        conversation_id: selectedConversation,
        content: newMessage,
      })
      setNewMessage("")
      loadMessages(selectedConversation)
    } catch (error) {
      console.error("Failed to send message:", error)
    }
  }

  const handleToggleStar = async (conversationId: number, e: React.MouseEvent) => {
    e.stopPropagation()
    try {
      const result = await messagesApi.toggleStar(conversationId)
      setConversations((prev) =>
        prev.map((conv) => (conv.id === conversationId ? { ...conv, starred: result.starred } : conv)),
      )
    } catch (error) {
      console.error("Failed to toggle star:", error)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed right-0 top-0 h-full w-full md:w-[400px] bg-background border-l shadow-lg z-50 flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Chats</h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {/* Conversations List */}
      {!selectedConversation ? (
        <ScrollArea className="flex-1">
          <div className="p-2">
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading conversations...</div>
            ) : conversations.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No conversations yet</div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => handleSelectConversation(conversation.id)}
                  className="w-full flex items-start gap-3 p-3 hover:bg-accent rounded-lg transition-colors text-left"
                >
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`/placeholder.svg?height=40&width=40`} />
                    <AvatarFallback>{conversation.participant_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-sm">{conversation.participant_name}</span>
                      {conversation.unread_count > 0 && (
                        <span className="text-xs bg-primary text-primary-foreground rounded-full px-2 py-0.5">
                          {conversation.unread_count}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conversation.last_message}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 shrink-0"
                    onClick={(e) => handleToggleStar(conversation.id, e)}
                  >
                    <Star className={cn("w-4 h-4", conversation.starred && "fill-yellow-400 text-yellow-400")} />
                  </Button>
                </button>
              ))
            )}
          </div>
        </ScrollArea>
      ) : (
        <>
          {/* Messages View */}
          <div className="flex items-center gap-3 p-4 border-b">
            <Button variant="ghost" size="sm" onClick={() => setSelectedConversation(null)}>
              ← Back
            </Button>
            <Avatar className="w-8 h-8">
              <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
              <AvatarFallback>
                {conversations.find((c) => c.id === selectedConversation)?.participant_name[0]}
              </AvatarFallback>
            </Avatar>
            <span className="font-medium">
              {conversations.find((c) => c.id === selectedConversation)?.participant_name}
            </span>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((message) => (
                <div key={message.id} className="flex gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={`/placeholder.svg?height=32&width=32`} />
                    <AvatarFallback>{message.sender_name[0]}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium">{message.sender_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(message.created_at).toLocaleTimeString()}
                      </span>
                    </div>
                    <p className="text-sm">{message.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Message Input */}
          <div className="p-4 border-t space-y-3">
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Bold className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Italic className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <LinkIcon className="w-4 h-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <Smile className="w-4 h-4" />
              </Button>
            </div>
            <div className="flex gap-2">
              <Input
                placeholder="Type a message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
              />
              <Button onClick={handleSendMessage} size="icon">
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
