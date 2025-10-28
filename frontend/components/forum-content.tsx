"use client"

import type React from "react"
import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, MessageCircle, Users } from "lucide-react"
import { Header } from "@/components/header"
import { Navigation } from "@/components/navigation"
import { forumApi, type ForumMessage } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"
import { websocketService } from "@/lib/websocket"

const FORUM_CATEGORIES = [
  { id: "events", label: "📅 Events", color: "from-blue-500 to-cyan-500" },
  { id: "ideas", label: "💡 Ideas", color: "from-yellow-500 to-orange-500" },
  { id: "announcements", label: "📢 Announcements", color: "from-purple-500 to-pink-500" },
  { id: "collaborate", label: "🤝 Collaborate", color: "from-green-500 to-emerald-500" },
  { id: "resources", label: "📚 Resources", color: "from-indigo-500 to-blue-500" },
  { id: "general", label: "💬 General", color: "from-gray-500 to-slate-500" },
]

export function ForumContent() {
  const [selectedCategory, setSelectedCategory] = useState("general")
  const [messages, setMessages] = useState<ForumMessage[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [onlineCount, setOnlineCount] = useState(0)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    if (!user) return

    // Connect to WebSocket for the selected category
    websocketService.connectForum(selectedCategory, (message) => {
      setMessages((prev) => [...prev, message])
      scrollToBottom()
    })

    loadMessages()

    return () => {
      websocketService.disconnectForum()
    }
  }, [selectedCategory, user])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadMessages = async () => {
    try {
      setIsLoading(true)
      const data = await forumApi.getMessages(selectedCategory)
      setMessages(data)
    } catch (err) {
      console.error("Failed to load forum messages:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      setIsSubmitting(true)
      await forumApi.postMessage(newMessage, selectedCategory)
      setNewMessage("")
    } catch (err: any) {
      console.error("Failed to send message:", err)
      if (err.message?.includes("inappropriate")) {
        alert("Your message contains inappropriate language. Please revise and try again.")
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  const currentCategory = FORUM_CATEGORIES.find((c) => c.id === selectedCategory)

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <Navigation activeCategory="Forum" onCategoryChange={() => {}} />

      <main className="container mx-auto px-4 py-6 max-w-6xl">
        <div className="mb-6 animate-fade-in">
          <div className="flex items-center gap-3 mb-4">
            <div className={`p-2 bg-gradient-to-br ${currentCategory?.color} rounded-xl shadow-lg`}>
              <MessageCircle className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">
                Forum Rooms
              </h1>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Users className="w-4 h-4" />
                <span>{onlineCount} online</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            {FORUM_CATEGORIES.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? "default" : "outline"}
                onClick={() => setSelectedCategory(category.id)}
                className={`transition-all hover:scale-105 ${
                  selectedCategory === category.id
                    ? `bg-gradient-to-r ${category.color} text-white border-0 shadow-lg`
                    : "hover:border-primary/50"
                }`}
              >
                {category.label}
              </Button>
            ))}
          </div>
        </div>

        <Card className="p-6 bg-white/80 backdrop-blur-sm shadow-xl border-primary/10 animate-slide-up">
          <div className="h-[500px] overflow-y-auto mb-4 space-y-4 pr-2 scroll-smooth">
            {isLoading ? (
              <div className="flex items-center justify-center h-full">
                <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center">
                <MessageCircle className="w-16 h-16 text-muted-foreground/50 mb-4" />
                <p className="text-muted-foreground">No messages yet. Be the first to start the conversation!</p>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex gap-3 animate-fade-in ${message.author.id === user?.id ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="w-10 h-10 ring-2 ring-primary/20 transition-transform hover:scale-110">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/30 to-primary/10 text-primary font-semibold">
                      {message.author.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-[70%] ${message.author.id === user?.id ? "items-end" : ""}`}>
                    <div
                      className={`rounded-2xl p-4 transition-all hover:shadow-md ${
                        message.author.id === user?.id
                          ? `bg-gradient-to-br ${currentCategory?.color} text-white ml-auto`
                          : "bg-gradient-to-br from-muted to-muted/50"
                      }`}
                    >
                      <p className="font-semibold text-sm mb-1">{message.author.name}</p>
                      <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1 px-2">
                      {new Date(message.created_at).toLocaleTimeString()}
                    </p>
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={handleSubmit} className="flex gap-2">
            <Textarea
              placeholder={`Message ${currentCategory?.label}...`}
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              className="flex-1 resize-none transition-all focus:ring-2 focus:ring-primary/50"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button
              type="submit"
              size="icon"
              disabled={isSubmitting || !newMessage.trim()}
              className={`h-auto px-4 bg-gradient-to-r ${currentCategory?.color} hover:opacity-90 transition-all hover:scale-105 shadow-lg`}
            >
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
