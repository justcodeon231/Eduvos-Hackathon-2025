"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Star, Send, Bold, Italic, LinkIcon, Smile, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { messagesApi, type Conversation, type Message } from "@/lib/api"

export function MessagesContent() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")

  useEffect(() => {
    loadConversations()
  }, [])

  const loadConversations = async () => {
    try {
      setLoading(true)
      const data = await messagesApi.getConversations()
      setConversations(data)
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0].id)
        loadMessages(data[0].id)
      }
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

  const filteredConversations = conversations.filter((conv) =>
    conv.participant_name.toLowerCase().includes(searchQuery.toLowerCase()),
  )

  const selectedConv = conversations.find((c) => c.id === selectedConversation)

  return (
    <div className="min-h-screen bg-background">
      <Header />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-180px)]">
          {/* Conversations List */}
          <div className="lg:col-span-1 border rounded-lg bg-card flex flex-col">
            <div className="p-4 border-b">
              <h2 className="text-lg font-semibold mb-3">Messages</h2>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Search conversations..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-2">
                {loading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading conversations...</div>
                ) : filteredConversations.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No conversations found</div>
                ) : (
                  filteredConversations.map((conversation) => (
                    <button
                      key={conversation.id}
                      onClick={() => handleSelectConversation(conversation.id)}
                      className={cn(
                        "w-full flex items-start gap-3 p-3 hover:bg-accent rounded-lg transition-colors text-left",
                        selectedConversation === conversation.id && "bg-accent",
                      )}
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
          </div>

          {/* Messages View */}
          <div className="lg:col-span-2 border rounded-lg bg-card flex flex-col">
            {selectedConv ? (
              <>
                <div className="flex items-center gap-3 p-4 border-b">
                  <Avatar className="w-10 h-10">
                    <AvatarImage src={`/placeholder.svg?height=40&width=40`} />
                    <AvatarFallback>{selectedConv.participant_name[0]}</AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedConv.participant_name}</h3>
                    <p className="text-xs text-muted-foreground">{selectedConv.participant_email}</p>
                  </div>
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
                          <div className="bg-accent rounded-lg p-3">
                            <p className="text-sm">{message.content}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>

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
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a conversation to start messaging
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
