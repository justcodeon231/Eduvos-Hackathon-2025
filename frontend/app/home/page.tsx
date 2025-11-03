"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { EduvosNav } from "@/components/eduvos-nav"
import { Users, ThumbsUp, MessageCircle, CalendarDays } from "lucide-react"
import { api } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useAppStore } from "@/lib/store"

export default function HomePage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [dashboardData, setDashboardData] = useState<any>(null)
  const { setSelectedView, unreadNotifications } = useAppStore()

  useEffect(() => {
    setSelectedView("home")
  }, [setSelectedView])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadDashboard()
    }
  }, [user])

  const loadDashboard = async () => {
    try {
      const data = await api.getDashboard()
      setDashboardData(data)
    } catch (error) {
      console.error("[v0] Failed to load dashboard:", error)
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
          {/* Main Content - Left Column */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Write New Idea Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#005EB8] text-white">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <button
                      onClick={() => router.push("/idea-hub")}
                      className="w-full text-left px-4 py-3 bg-[#F9FAFB] border border-gray-200 rounded-lg text-gray-500 hover:bg-white hover:border-[#005EB8] transition-colors text-sm md:text-base"
                    >
                      Share an idea, opportunity, or update...
                    </button>
                    <div className="flex items-center gap-2 md:gap-4 mt-3">
                      <Button variant="ghost" size="sm" className="text-[#005EB8] text-xs md:text-sm">
                        # Tag
                      </Button>
                      <Button variant="ghost" size="sm" className="text-[#005EB8] text-xs md:text-sm">
                        Media
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Community Highlights */}
            <div>
              <h2 className="text-lg md:text-xl font-bold text-[#111111] mb-4">Community Highlights</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <Card key={i} className="overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
                    <div className="aspect-video bg-gradient-to-br from-[#005EB8] to-[#003E73]"></div>
                    <CardContent className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Avatar className="h-6 w-6">
                          <AvatarFallback className="bg-[#005EB8] text-white text-xs">SM</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-gray-500">Simon • 2h ago</span>
                      </div>
                      <h3 className="font-semibold text-[#111111] mb-2 text-sm md:text-base">Innovation Idea #{i}</h3>
                      <p className="text-xs md:text-sm text-gray-600 mb-3">
                        Exploring new approaches to campus collaboration...
                      </p>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs px-2 py-1 bg-[#CCE5FF] text-[#005EB8] rounded-full">#Innovation</span>
                        <span className="text-xs px-2 py-1 bg-[#CCE5FF] text-[#005EB8] rounded-full">#Tech</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
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

            {/* Your Idea Dashboard */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base">Your Idea Dashboard</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Total Ideas</p>
                    <p className="text-xl md:text-2xl font-bold text-[#111111]">{dashboardData?.total_posts || 0}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Collaborations</p>
                    <p className="text-xl md:text-2xl font-bold text-[#111111]">{dashboardData?.total_comments || 0}</p>
                  </div>
                </div>
                <div className="space-y-3 pt-3 border-t border-gray-100">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ThumbsUp className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-[#111111]">Likes</p>
                        <p className="text-xs text-gray-500">Likes received this month</p>
                      </div>
                    </div>
                    <p className="text-base md:text-lg font-bold text-[#111111]">{dashboardData?.total_likes || 0}</p>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <MessageCircle className="h-4 w-4 text-gray-500" />
                      <div>
                        <p className="text-sm font-medium text-[#111111]">Comments</p>
                        <p className="text-xs text-gray-500">Discussions you started</p>
                      </div>
                    </div>
                    <p className="text-base md:text-lg font-bold text-[#111111]">
                      {dashboardData?.total_comments || 0}
                    </p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 text-center pt-2">Activity reflects last 30 days</p>
              </CardContent>
            </Card>

            {/* Connect & Collaborate */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm md:text-base flex items-center gap-2">
                  <Users className="h-5 w-5 text-[#005EB8]" />
                  Connect & Collaborate
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {["Prof. Rivera", "Lina Patel", "Dr. Ndlovu"].map((name, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#005EB8] text-white text-xs">
                          {name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="text-sm font-medium text-[#111111]">{name}</p>
                        <p className="text-xs text-gray-500">
                          {i === 0 ? "AI mentor" : i === 1 ? "UX student" : "Sustainability Strategist"}
                        </p>
                      </div>
                    </div>
                    <Button size="sm" className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-xs md:text-sm">
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
