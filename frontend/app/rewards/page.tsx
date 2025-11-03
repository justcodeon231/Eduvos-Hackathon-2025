"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { EduvosNav } from "@/components/eduvos-nav"
import { Trophy, Award, ThumbsUp, MessageCircle, TrendingUp } from "lucide-react"
import { api } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"

export default function RewardsPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const [leaderboard, setLeaderboard] = useState<any[]>([])
  const [dashboardData, setDashboardData] = useState<any>(null)

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadData()
    }
  }, [user])

  const loadData = async () => {
    try {
      const [leaderboardData, dashboard] = await Promise.all([api.getLeaderboard(), api.getDashboard()])
      setLeaderboard(leaderboardData)
      setDashboardData(dashboard)
    } catch (error) {
      console.error("[v0] Failed to load rewards data:", error)
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

  const calculateLevel = (points: number) => {
    if (points < 500) return 1
    if (points < 1000) return 2
    if (points < 2000) return 3
    if (points < 3500) return 4
    return 5
  }

  const calculateProgress = (points: number) => {
    const level = calculateLevel(points)
    const thresholds = [0, 500, 1000, 2000, 3500, 5000]
    const currentThreshold = thresholds[level - 1]
    const nextThreshold = thresholds[level]
    const progress = ((points - currentThreshold) / (nextThreshold - currentThreshold)) * 100
    return Math.min(progress, 100)
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

  const userPoints = dashboardData?.total_likes || 0
  const userLevel = calculateLevel(userPoints)
  const progress = calculateProgress(userPoints)

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <EduvosNav />

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Rewards & Gamification Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Trophy className="h-6 w-6 text-[#FFB400]" />
                <h1 className="text-2xl font-bold text-[#111111]">Rewards & Gamification</h1>
              </div>
              <p className="text-gray-600">
                Earn recognition by contributing impactful ideas and collaborating with peers
              </p>
            </div>

            {/* User Progress */}
            <div className="flex items-start gap-4 p-6 bg-[#F9FAFB] rounded-lg">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="bg-[#005EB8] text-white text-lg">{getInitials(user.name)}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-[#111111]">You</p>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1 px-3 py-1 bg-[#1E3A8A] text-white rounded-full text-sm font-medium">
                      <Award className="h-4 w-4" />
                      Lv{userLevel}
                    </div>
                    <div className="flex items-center gap-1 px-3 py-1 bg-white border border-gray-200 rounded-full text-sm font-medium text-gray-600">
                      <Trophy className="h-4 w-4" />
                      Lv{userLevel + 1}
                    </div>
                  </div>
                </div>
                <div className="mb-2">
                  <Progress value={progress} className="h-2" />
                </div>
                <p className="text-sm text-gray-600">
                  {userLevel === 1 ? "50%" : `${Math.round(progress)}%`} to Level {userLevel + 1}
                </p>

                {/* Level Badges */}
                <div className="flex items-center gap-2 mt-4">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm font-medium ${
                        level <= userLevel
                          ? "bg-[#1E3A8A] text-white"
                          : level === userLevel + 1
                            ? "bg-white border-2 border-[#1E3A8A] text-[#1E3A8A]"
                            : "bg-gray-100 text-gray-400"
                      }`}
                    >
                      <Award className="h-3 w-3" />
                      Lv{level}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Leaderboard */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#005EB8]" />
              Leaderboard (This week)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {leaderboard.slice(0, 4).map((entry, index) => (
                <div
                  key={entry.user_id}
                  className={`flex items-center gap-4 p-4 rounded-lg ${
                    entry.user_id === user.id ? "bg-[#CCE5FF]" : "bg-[#F9FAFB]"
                  }`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-white ${
                      index === 0 ? "bg-[#FFB400]" : "bg-[#1E3A8A]"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#005EB8] text-white">{getInitials(entry.user_name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-semibold text-[#111111]">{entry.user_name}</p>
                  </div>
                  <p className="font-bold text-[#111111]">{entry.total_points} pts</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Your Dashboard */}
        <Card>
          <CardHeader>
            <CardTitle>Your Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Total Ideas</p>
                <p className="text-3xl font-bold text-[#111111]">{dashboardData?.total_posts || 0}</p>
              </div>
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="text-sm text-gray-600 mb-1">Collaborations</p>
                <p className="text-3xl font-bold text-[#111111]">{dashboardData?.total_comments || 0}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FFB400]/10 flex items-center justify-center">
                    <ThumbsUp className="h-5 w-5 text-[#FFB400]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#111111]">Likes</p>
                    <p className="text-sm text-gray-600">Likes received this month</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111111]">{dashboardData?.total_likes || 0}</p>
              </div>

              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#FF5A5F]/10 flex items-center justify-center">
                    <MessageCircle className="h-5 w-5 text-[#FF5A5F]" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#111111]">Comments</p>
                    <p className="text-sm text-gray-600">Discussions you started</p>
                  </div>
                </div>
                <p className="text-2xl font-bold text-[#111111]">{dashboardData?.total_comments || 0}</p>
              </div>
            </div>

            <p className="text-sm text-gray-400 text-center mt-6">Activity reflects last 30 days</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
