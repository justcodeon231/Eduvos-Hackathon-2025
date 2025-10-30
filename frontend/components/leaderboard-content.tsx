"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { leaderboardApi, dashboardApi, type LeaderboardUser, type DashboardStats } from "@/lib/api"
import { Trophy } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"

export function LeaderboardContent() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [dashboardStats, setDashboardStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const { user: currentUser } = useAuth()

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [leaderboardData, statsData] = await Promise.all([
        leaderboardApi.getLeaderboard(10),
        dashboardApi.getStats(),
      ])
      setUsers(leaderboardData)
      setDashboardStats(statsData)
    } catch (err) {
      console.error("Failed to load data:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const calculateLevel = (points: number) => {
    const level = Math.floor(points / 500) + 1
    const progress = ((points % 500) / 500) * 100
    return { level: Math.min(level, 5), progress }
  }

  const currentUserData = users.find((u) => u.id === currentUser?.id)
  const userLevel = currentUserData ? calculateLevel(currentUserData.points) : { level: 1, progress: 0 }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <nav className="border-b bg-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center gap-8 overflow-x-auto">
            <a
              href="/"
              className="py-4 px-2 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              Home
            </a>
            <a
              href="/"
              className="py-4 px-2 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              Idea Hub
            </a>
            <a
              href="/"
              className="py-4 px-2 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              Collaboration Rooms
            </a>
            <a
              href="/"
              className="py-4 px-2 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              Mentorship & Knowledge
            </a>
            <a
              href="/leaderboard"
              className="py-4 px-2 text-sm font-medium text-foreground border-b-2 border-primary whitespace-nowrap"
            >
              Rewards & Gamification
            </a>
            <a
              href="/profile"
              className="py-4 px-2 text-sm font-medium text-muted-foreground hover:text-foreground whitespace-nowrap"
            >
              Profile
            </a>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Trophy className="w-6 h-6 text-gray-700" />
            <h1 className="text-2xl font-bold text-gray-900">Rewards & Gamification</h1>
          </div>
          <p className="text-sm text-gray-600">
            Earn recognition by contributing impactful ideas and collaborating with peers
          </p>
        </div>

        {currentUserData && (
          <Card className="p-6 mb-6 bg-white">
            <div className="flex items-center gap-4 mb-4">
              <Avatar className="w-12 h-12">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
                  {currentUserData.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">You</h3>
                <div className="mt-2">
                  <div className="flex items-center justify-between text-sm text-gray-600 mb-1">
                    <span>
                      {Math.round(userLevel.progress)}% to Level {userLevel.level + 1}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-[#1e3a8a] h-2 rounded-full transition-all"
                      style={{ width: `${userLevel.progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <div
                  key={level}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium ${
                    level <= userLevel.level ? "bg-[#1e3a8a] text-white" : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <Trophy className="w-3 h-3" />
                  <span>Lv{level}</span>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 mb-6 bg-white">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-5 h-5 flex items-center justify-center">
              <div className="w-4 h-4 border-2 border-gray-400 rounded" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Leaderboard (This week)</h2>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-3 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <div className="space-y-2">
              {users.slice(0, 4).map((user, index) => {
                const isCurrentUser = user.id === currentUser?.id
                return (
                  <div
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-lg ${isCurrentUser ? "bg-gray-100" : "bg-white"}`}
                  >
                    <div className="flex items-center justify-center w-8 h-8 rounded-full bg-[#1e3a8a] text-white font-semibold text-sm">
                      {index + 1}
                    </div>

                    <Avatar className="w-10 h-10">
                      <AvatarImage src="/placeholder.svg" />
                      <AvatarFallback className="bg-gray-200 text-gray-700 font-semibold">
                        {user.name[0]}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{isCurrentUser ? "You" : user.name}</h3>
                    </div>

                    <div className="text-sm font-semibold text-gray-900">{user.points.toLocaleString()} pts</div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {dashboardStats && (
          <Card className="p-6 bg-white">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Dashboard</h2>

            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Total Ideas</div>
                <div className="text-2xl font-bold text-gray-900">{dashboardStats.stats.total_posts}</div>
              </div>
              <div>
                <div className="text-sm text-gray-600 mb-1">Collaborations</div>
                <div className="text-2xl font-bold text-gray-900">0</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between py-3 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 text-gray-600">👍</div>
                  <div>
                    <div className="font-medium text-gray-900">Likes</div>
                    <div className="text-xs text-gray-500">Likes received this month</div>
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-900">{dashboardStats.stats.total_likes}</div>
              </div>

              <div className="flex items-center justify-between py-3 border-t">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 text-gray-600">💬</div>
                  <div>
                    <div className="font-medium text-gray-900">Comments</div>
                    <div className="text-xs text-gray-500">Discussions you started</div>
                  </div>
                </div>
                <div className="text-lg font-semibold text-gray-900">{dashboardStats.stats.total_comments}</div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t text-center text-xs text-gray-500">Activity reflects last 30 days</div>
          </Card>
        )}
      </div>
    </div>
  )
}
