"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { EduvosNav } from "@/components/eduvos-nav"
import { Hash, Video, FileText, Send, Paperclip, Users, CalendarDays } from "lucide-react"
import { api, type User as UserType } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { wsManager } from "@/lib/websocket"
import { useAppStore } from "@/lib/store"

interface Message {
  id: number
  sender_id: number
  sender_name: string
  content: string
  created_at: string
}

export default function CollaborationRoomsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { activeCollabCategory, setActiveCollabCategory, setSelectedView, unreadNotifications } = useAppStore()
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [connections, setConnections] = useState<UserType[]>([])

  const categories = [
    { name: "General", color: "bg-[#1E3A8A]" },
    { name: "Humanities and Arts", color: "bg-gray-600" },
    { name: "Commerce and Law", color: "bg-gray-600" },
    { name: "Applied Science", color: "bg-gray-600" },
    { name: "Education", color: "bg-gray-600" },
  ]

  useEffect(() => {
    setSelectedView("collaboration-rooms")
  }, [setSelectedView])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadConnections()
      loadMessages()
      wsManager.connect(user.id)
    }

    return () => {
      wsManager.disconnect()
    }
  }, [user])

  const loadConnections = async () => {
    try {
      const users = await api.searchUsers("")
      setConnections(users.filter((u) => u.id !== user?.id).slice(0, 3))
    } catch (error) {
      console.error("[v0] Failed to load connections:", error)
    }
  }

  const loadMessages = async () => {
    // Simulate loading room messages
    setMessages([
      {
        id: 1,
        sender_id: 1,
        sender_name: "Taylor",
        content: "Week 1 goals: prototype, feedback loop, and KPI draft.",
        created_at: new Date(Date.now() - 7200000).toISOString(),
      },
      {
        id: 2,
        sender_id: 2,
        sender_name: "Maya",
        content: "Uploaded mockups to Drive and shared the link here.",
        created_at: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: 3,
        sender_id: 3,
        sender_name: "Omar",
        content: "Let's split tasks via the AI Co-Pilot",
        created_at: new Date(Date.now() - 1800000).toISOString(),
      },
      {
        id: 4,
        sender_id: 4,
        sender_name: "Hackiam",
        content: "Can we get a status check on yesterday's deliverables?",
        created_at: new Date(Date.now() - 900000).toISOString(),
      },
      {
        id: 5,
        sender_id: 5,
        sender_name: "Pumeza",
        content: "Week 2 priorities: user testing, bug fixes, and performance metrics.",
        created_at: new Date(Date.now() - 600000).toISOString(),
      },
      {
        id: 6,
        sender_id: 6,
        sender_name: "Aisha",
        content: "Let's assign owners for the next milestone in the Co-Pilot.",
        created_at: new Date(Date.now() - 300000).toISOString(),
      },
    ])
  }

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !user) return

    const tempMessage: Message = {
      id: Date.now(),
      sender_id: user.id,
      sender_name: user.name,
      content: newMessage,
      created_at: new Date().toISOString(),
    }

    setMessages([...messages, tempMessage])
    setNewMessage("")
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

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <EduvosNav unreadCount={unreadNotifications} />

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Category Filters */}
            <div className="flex items-center gap-2 flex-wrap">
              {categories.map((category) => (
                <button
                  key={category.name}
                  onClick={() => setActiveCollabCategory(category.name)}
                  className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg text-xs md:text-sm font-medium transition-colors ${
                    activeCollabCategory === category.name
                      ? `${category.color} text-white`
                      : "bg-white text-gray-600 hover:bg-[#F4F8FB] border border-gray-200"
                  }`}
                >
                  <Hash className="h-4 w-4" />
                  <span className="hidden sm:inline">{category.name}</span>
                  <span className="sm:hidden">{category.name.split(" ")[0]}</span>
                </button>
              ))}
            </div>

            {/* Room Header */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <Hash className="h-5 w-5 text-[#005EB8]" />
                    <h2 className="text-xl font-bold text-[#111111]">{activeCollabCategory}</h2>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" className="text-[#005EB8] border-[#005EB8] bg-transparent">
                      <FileText className="h-4 w-4 mr-2" />
                      Drive/Office
                    </Button>
                    <Button size="sm" className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                      <Video className="h-4 w-4 mr-2" />
                      Join Call
                    </Button>
                  </div>
                </div>

                {/* Tab Navigation */}
                <div className="flex items-center gap-4 border-b border-gray-200">
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[#005EB8] border-b-2 border-[#005EB8]">
                    All
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#005EB8]">
                    Files
                  </button>
                  <button className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-[#005EB8]">
                    Mentions
                  </button>
                </div>
              </CardContent>
            </Card>

            {/* Messages */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4 mb-6 max-h-[500px] overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#005EB8] text-white flex items-center justify-center text-xs font-bold flex-shrink-0">
                        {message.sender_name[0]}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-baseline gap-2 mb-1">
                          <p className="font-semibold text-[#111111] text-sm">{message.sender_name}</p>
                          <p className="text-xs text-gray-500">{formatTime(message.created_at)}</p>
                        </div>
                        <p className="text-sm text-gray-700">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Message Input */}
                <div className="flex items-center gap-2 pt-4 border-t border-gray-200">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                    placeholder="New message"
                    className="flex-1"
                  />
                  <Button variant="ghost" size="icon">
                    <Paperclip className="h-5 w-5 text-gray-500" />
                  </Button>
                  <Button onClick={handleSendMessage} className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                    <Send className="h-4 w-4 mr-2" />
                    Send
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CalendarDays className="h-5 w-5 text-[#005EB8]" />
                  Upcoming Events
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#005EB8] mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111111]">Hackathon</p>
                    <p className="text-xs text-gray-500">Fri 5 PM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#005EB8] mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111111]">Pitch workshop reminder</p>
                    <p className="text-xs text-gray-500">Sat 10 AM</p>
                  </div>
                </div>
                <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                  <div className="w-2 h-2 rounded-full bg-[#005EB8] mt-1.5"></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[#111111]">Submit sprint demo</p>
                    <p className="text-xs text-gray-500">Tue 6 PM</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connect & Collaborate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#005EB8]" />
                  Connect & Collaborate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {connections.map((connection, i) => (
                  <div key={connection.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#005EB8] text-white text-xs">
                          {getInitials(connection.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-[#111111]">{connection.name}</p>
                        <p className="text-xs text-gray-500">
                          {i === 0 ? "AI mentor" : i === 1 ? "UX student" : "Sustainability Strategist"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white">
                      Connect
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
