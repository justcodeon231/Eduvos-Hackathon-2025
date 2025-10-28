"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { leaderboardApi, type LeaderboardUser } from "@/lib/api"
import { Trophy, Medal, Award, TrendingUp } from "lucide-react"

export function LeaderboardContent() {
  const [users, setUsers] = useState<LeaderboardUser[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadLeaderboard()
  }, [])

  const loadLeaderboard = async () => {
    try {
      const data = await leaderboardApi.getLeaderboard()
      setUsers(data)
    } catch (err) {
      console.error("Failed to load leaderboard:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Trophy className="w-6 h-6 text-yellow-500" />
    if (rank === 2) return <Medal className="w-6 h-6 text-gray-400" />
    if (rank === 3) return <Award className="w-6 h-6 text-orange-600" />
    return <span className="text-lg font-bold text-muted-foreground">#{rank}</span>
  }

  const getRankColor = (rank: number) => {
    if (rank === 1) return "from-yellow-500 to-orange-500"
    if (rank === 2) return "from-gray-400 to-gray-500"
    if (rank === 3) return "from-orange-600 to-red-500"
    return "from-primary to-primary/70"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8 animate-fade-in">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-gradient-to-br from-yellow-500 to-orange-500 rounded-xl shadow-lg">
              <Trophy className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-500 to-orange-500 bg-clip-text text-transparent">
              Leaderboard
            </h1>
          </div>
          <p className="text-muted-foreground">Top contributors in the community</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-3">
            {users.map((user, index) => (
              <Card
                key={user.id}
                className={`p-4 transition-all hover:shadow-lg hover:scale-[1.02] animate-slide-up ${
                  index < 3 ? "border-2" : ""
                }`}
                style={{
                  borderColor: index < 3 ? `hsl(var(--primary))` : undefined,
                  animationDelay: `${index * 50}ms`,
                }}
              >
                <div className="flex items-center gap-4">
                  <div className="flex items-center justify-center w-12">{getRankIcon(index + 1)}</div>

                  <Avatar className="w-12 h-12 ring-2 ring-primary/20">
                    <AvatarImage src="/placeholder.svg" />
                    <AvatarFallback className={`bg-gradient-to-br ${getRankColor(index + 1)} text-white font-bold`}>
                      {user.name[0]}
                    </AvatarFallback>
                  </Avatar>

                  <div className="flex-1">
                    <h3 className="font-semibold text-lg">{user.name}</h3>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>{user.post_count} posts</span>
                      <span>{user.like_count} likes</span>
                      <span>{user.comment_count} comments</span>
                    </div>
                  </div>

                  <div className="text-right">
                    <Badge
                      className={`bg-gradient-to-r ${getRankColor(index + 1)} text-white border-0 text-lg px-3 py-1`}
                    >
                      {user.points} pts
                    </Badge>
                    {index < 3 && (
                      <div className="flex items-center gap-1 text-xs text-green-500 mt-1">
                        <TrendingUp className="w-3 h-3" />
                        <span>Top {index + 1}</span>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
