"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Send, MessageCircle } from "lucide-react"
import { Header } from "@/components/header"
import { Navigation } from "@/components/navigation"
import { postsApi, type FeedPost } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

export function ForumContent() {
  const [messages, setMessages] = useState<FeedPost[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const { user } = useAuth()

  useEffect(() => {
    loadMessages()
    // Poll for new messages every 5 seconds
    const interval = setInterval(loadMessages, 5000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  const loadMessages = async () => {
    try {
      const data = await postsApi.getFeed("forum", 0, 50)
      setMessages(data.reverse())
    } catch (err) {
      console.error("[v0] Failed to load forum messages:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    try {
      setIsSubmitting(true)
      await postsApi.createPost({
        title: "Forum Message",
        content: newMessage,
        category: "forum",
      })
      setNewMessage("")
      await loadMessages()
    } catch (err) {
      console.error("[v0] Failed to send message:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeTab="Forum" onTabChange={() => {}} />

      <main className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <MessageCircle className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold">Global Forum</h1>
          </div>
          <p className="text-muted-foreground">Join the conversation with the entire community</p>
        </div>

        <Card className="p-6 bg-white shadow-lg">
          <div className="h-[500px] overflow-y-auto mb-4 space-y-4 pr-2">
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
                  className={`flex gap-3 ${message.author.id === user?.id ? "flex-row-reverse" : ""}`}
                >
                  <Avatar className="w-10 h-10 ring-2 ring-primary/10">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                      {message.author.name[0]}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`flex-1 max-w-[70%] ${message.author.id === user?.id ? "items-end" : ""}`}>
                    <div
                      className={`rounded-2xl p-4 ${
                        message.author.id === user?.id ? "bg-primary text-primary-foreground ml-auto" : "bg-muted"
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
              placeholder="Type your message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              disabled={isSubmitting}
              rows={2}
              className="flex-1 resize-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault()
                  handleSubmit(e)
                }
              }}
            />
            <Button type="submit" size="icon" disabled={isSubmitting || !newMessage.trim()} className="h-auto px-4">
              <Send className="w-5 h-5" />
            </Button>
          </form>
        </Card>
      </main>
    </div>
  )
}
