"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { dashboardApi, type DashboardStats } from "@/lib/api"
import { FileText, ThumbsUp, MessageSquare, TrendingUp, Trophy, Award } from "lucide-react"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const data = await dashboardApi.getStats()
      setStats(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard stats")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <Header />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8 animate-fade-in">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent mb-2">
            Analytics Dashboard
          </h1>
          <p className="text-muted-foreground">Track your engagement and performance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <Card className="p-6 bg-gradient-to-br from-yellow-500/10 to-orange-500/10 border-yellow-500/20 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Points</p>
                <p className="text-3xl font-bold text-yellow-600">{stats?.user?.points || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg">
                <Trophy className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-yellow-600" />
              <span className="text-yellow-600 font-medium">Rank #{stats?.user?.rank || "N/A"}</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Posts</p>
                <p className="text-3xl font-bold">{stats?.stats?.total_posts || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Active</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Likes</p>
                <p className="text-3xl font-bold">{stats?.stats?.total_likes || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-pink-500 to-red-500 flex items-center justify-center shadow-lg">
                <ThumbsUp className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Growing</span>
            </div>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Total Comments</p>
                <p className="text-3xl font-bold">{stats?.stats?.total_comments || 0}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg">
                <MessageSquare className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <TrendingUp className="w-4 h-4 text-green-500" />
              <span className="text-green-500">Engaged</span>
            </div>
          </Card>

          <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20 hover:shadow-xl transition-all hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground mb-1">Achievements</p>
                <p className="text-3xl font-bold text-purple-600">{Math.floor((stats?.user?.points || 0) / 100)}</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center shadow-lg">
                <Award className="w-6 h-6 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-4 text-sm">
              <Badge variant="secondary" className="text-xs">
                Level {Math.floor((stats?.user?.points || 0) / 500) + 1}
              </Badge>
            </div>
          </Card>
        </div>

        <Card className="p-6 hover:shadow-xl transition-all">
          <h2 className="text-xl font-semibold mb-6">Engagement Over Time</h2>
          <ChartContainer
            config={{
              likes: {
                label: "Likes",
                color: "hsl(var(--chart-1))",
              },
              comments: {
                label: "Comments",
                color: "hsl(var(--chart-2))",
              },
            }}
            className="h-[400px]"
          >
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={stats?.stats?.engagement_data || []} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Legend />
                <Line type="monotone" dataKey="likes" stroke="var(--color-likes)" name="Likes" strokeWidth={2} />
                <Line
                  type="monotone"
                  dataKey="comments"
                  stroke="var(--color-comments)"
                  name="Comments"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Card>
      </div>
    </div>
  )
}
