"use client"

import { useState, useEffect } from "react"
import { Header } from "@/components/header"
import { Card } from "@/components/ui/card"
import { dashboardApi, leaderboardApi, type DashboardStats } from "@/lib/api"
import { ThumbsUp, MessageSquare, TrendingUp, Trophy, Zap, Target, Sparkles } from "lucide-react"
import { XAxis, YAxis, CartesianGrid, Legend, ResponsiveContainer, Area, AreaChart } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import Link from "next/link"

function AnimatedNumber({ value, duration = 1000 }: { value: number; duration?: number }) {
  const [displayValue, setDisplayValue] = useState(0)

  useEffect(() => {
    let startTime: number
    let animationFrame: number

    const animate = (currentTime: number) => {
      if (!startTime) startTime = currentTime
      const progress = Math.min((currentTime - startTime) / duration, 1)

      setDisplayValue(Math.floor(progress * value))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [value, duration])

  return <span className="animate-count-up">{displayValue.toLocaleString()}</span>
}

function ProgressRing({ progress, size = 120 }: { progress: number; size?: number }) {
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = radius * 2 * Math.PI
  const offset = circumference - (progress / 100) * circumference

  return (
    <svg width={size} height={size} className="transform -rotate-90">
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="currentColor"
        strokeWidth={strokeWidth}
        fill="none"
        className="text-muted/20"
      />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        stroke="url(#gradient)"
        strokeWidth={strokeWidth}
        fill="none"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-1000 ease-out"
      />
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#8B5CF6" />
          <stop offset="100%" stopColor="#EC4899" />
        </linearGradient>
      </defs>
    </svg>
  )
}

export function DashboardContent() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [leaderboardPreview, setLeaderboardPreview] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setIsLoading(true)
      const [dashboardData, leaderboardData] = await Promise.all([
        dashboardApi.getStats(),
        leaderboardApi.getLeaderboard().catch(() => []),
      ])
      setStats(dashboardData)
      setLeaderboardPreview(leaderboardData.slice(0, 3))
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard stats")
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-pink-50/30 dark:from-background dark:via-purple-950/10 dark:to-pink-950/10">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="flex items-center justify-center py-12">
            <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-pink-50/30">
        <Header />
        <div className="container mx-auto px-4 py-12">
          <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        </div>
      </div>
    )
  }

  const currentPoints = stats?.user?.points || 0
  const currentLevel = Math.floor(currentPoints / 500) + 1
  const pointsInLevel = currentPoints % 500
  const progressToNextLevel = (pointsInLevel / 500) * 100
  const currentRank = stats?.user?.rank || 0
  const totalPosts = stats?.stats?.total_posts || 0
  const totalLikes = stats?.stats?.total_likes || 0
  const totalComments = stats?.stats?.total_comments || 0

  const getPerformanceColor = (current: number, threshold: number) => {
    if (current >= threshold * 1.5) return "text-green-500"
    if (current >= threshold) return "text-yellow-500"
    return "text-orange-500"
  }

  const getPerformanceGradient = (current: number, threshold: number) => {
    if (current >= threshold * 1.5) return "from-green-500/20 to-emerald-500/20 border-green-500/30"
    if (current >= threshold) return "from-yellow-500/20 to-orange-500/20 border-yellow-500/30"
    return "from-orange-500/20 to-red-500/20 border-orange-500/30"
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-purple-50/30 to-pink-50/30 dark:from-background dark:via-purple-950/10 dark:to-pink-950/10">
      <Header />
      <div className="container mx-auto px-4 py-8 max-w-7xl">
        <div className="mb-12 animate-fade-in">
          <div className="flex flex-col md:flex-row items-center gap-8 mb-8">
            <div className="relative">
              <ProgressRing progress={progressToNextLevel} size={140} />
              <div className="absolute inset-0 flex items-center justify-center">
                <Avatar className="w-24 h-24 border-4 border-background shadow-xl">
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback className="text-2xl font-bold bg-gradient-to-br from-purple-500 to-pink-500 text-white">
                    You
                  </AvatarFallback>
                </Avatar>
              </div>
              <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-gradient-to-r from-purple-500 to-pink-500 text-white px-4 py-1 rounded-full text-sm font-bold shadow-lg">
                Level {currentLevel}
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-purple-600 via-pink-600 to-orange-500 bg-clip-text text-transparent mb-3">
                Your Performance Hub
              </h1>
              <p className="text-lg text-muted-foreground mb-4">
                Track your growth, celebrate achievements, and level up your impact
              </p>
              <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                <Badge
                  variant="secondary"
                  className="px-4 py-2 text-sm bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
                >
                  <Sparkles className="w-4 h-4 mr-2" />
                  {pointsInLevel} / 500 XP to Level {currentLevel + 1}
                </Badge>
                <Badge
                  variant="secondary"
                  className="px-4 py-2 text-sm bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-300"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Rank #{currentRank}
                </Badge>
              </div>
            </div>
          </div>
        </div>

        <TooltipProvider>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {/* Total Points Card - Gold theme for achievement */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Card className="group relative overflow-hidden bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-amber-500/10 border-yellow-500/20 hover:border-yellow-500/40 transition-all duration-300 hover:scale-105 hover:shadow-2xl cursor-pointer">
                  <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 to-orange-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Points</p>
                        <p className="text-4xl font-bold text-yellow-600 dark:text-yellow-400">
                          <AnimatedNumber value={currentPoints} />
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-yellow-500 to-orange-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Trophy className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-yellow-600" />
                      <span className="text-sm font-medium text-yellow-600">Achievement Unlocked</span>
                    </div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Total points earned from all activities</p>
              </TooltipContent>
            </Tooltip>

            {/* Total Posts Card - Purple theme for creativity */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className={`group relative overflow-hidden bg-gradient-to-br ${getPerformanceGradient(totalPosts, 10)} hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-indigo-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Ideas Shared</p>
                        <p className="text-4xl font-bold text-purple-600 dark:text-purple-400">
                          <AnimatedNumber value={totalPosts} />
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-purple-500 to-indigo-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <Sparkles className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className={`w-4 h-4 ${getPerformanceColor(totalPosts, 10)}`} />
                      <span className={`text-sm font-medium ${getPerformanceColor(totalPosts, 10)}`}>
                        {totalPosts >= 15 ? "Highly Creative" : totalPosts >= 10 ? "Creative" : "Keep Sharing"}
                      </span>
                    </div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Total posts and ideas you've shared</p>
              </TooltipContent>
            </Tooltip>

            {/* Total Likes Card - Green theme for growth */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className={`group relative overflow-hidden bg-gradient-to-br ${getPerformanceGradient(totalLikes, 50)} hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-emerald-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Total Likes</p>
                        <p className="text-4xl font-bold text-green-600 dark:text-green-400">
                          <AnimatedNumber value={totalLikes} />
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <ThumbsUp className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <TrendingUp className={`w-4 h-4 ${getPerformanceColor(totalLikes, 50)}`} />
                      <span className={`text-sm font-medium ${getPerformanceColor(totalLikes, 50)}`}>
                        {totalLikes >= 75 ? "Viral Growth" : totalLikes >= 50 ? "Growing" : "Building Momentum"}
                      </span>
                    </div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Likes received across all your posts</p>
              </TooltipContent>
            </Tooltip>

            {/* Total Comments Card - Blue theme for engagement */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Card
                  className={`group relative overflow-hidden bg-gradient-to-br ${getPerformanceGradient(totalComments, 20)} hover:scale-105 hover:shadow-2xl transition-all duration-300 cursor-pointer`}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="relative p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground mb-2">Discussions</p>
                        <p className="text-4xl font-bold text-blue-600 dark:text-blue-400">
                          <AnimatedNumber value={totalComments} />
                        </p>
                      </div>
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
                        <MessageSquare className="w-7 h-7 text-white" />
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Target className={`w-4 h-4 ${getPerformanceColor(totalComments, 20)}`} />
                      <span className={`text-sm font-medium ${getPerformanceColor(totalComments, 20)}`}>
                        {totalComments >= 30
                          ? "Highly Engaged"
                          : totalComments >= 20
                            ? "Engaged"
                            : "Join Conversations"}
                      </span>
                    </div>
                  </div>
                </Card>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-sm">Comments received on your posts</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </TooltipProvider>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2 p-6 hover:shadow-xl transition-all glass-card">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                  Engagement Trends
                </h2>
                <p className="text-sm text-muted-foreground mt-1">Your activity over the last 7 days</p>
              </div>
              <Badge
                variant="secondary"
                className="bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300"
              >
                Last 7 Days
              </Badge>
            </div>
            <ChartContainer
              config={{
                likes: {
                  label: "Likes",
                  color: "hsl(142, 76%, 36%)",
                },
                comments: {
                  label: "Comments",
                  color: "hsl(221, 83%, 53%)",
                },
              }}
              className="h-[350px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={stats?.stats?.engagement_data || []}
                  margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorLikes" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(142, 76%, 36%)" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorComments" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="hsl(221, 83%, 53%)" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="date" stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="likes"
                    stroke="hsl(142, 76%, 36%)"
                    fillOpacity={1}
                    fill="url(#colorLikes)"
                    strokeWidth={3}
                    name="Likes"
                  />
                  <Area
                    type="monotone"
                    dataKey="comments"
                    stroke="hsl(221, 83%, 53%)"
                    fillOpacity={1}
                    fill="url(#colorComments)"
                    strokeWidth={3}
                    name="Comments"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </ChartContainer>
          </Card>

          <Card className="p-6 hover:shadow-xl transition-all glass-card">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold">Leaderboard</h3>
              <Link href="/leaderboard">
                <Badge
                  variant="outline"
                  className="cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                >
                  View All
                </Badge>
              </Link>
            </div>
            <div className="space-y-4">
              {leaderboardPreview.map((user, index) => (
                <div
                  key={user.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                      index === 0
                        ? "bg-gradient-to-br from-yellow-400 to-orange-500 text-white"
                        : index === 1
                          ? "bg-gradient-to-br from-gray-300 to-gray-400 text-gray-700"
                          : "bg-gradient-to-br from-orange-400 to-orange-600 text-white"
                    }`}
                  >
                    {index + 1}
                  </div>
                  <Avatar className="w-10 h-10">
                    <AvatarFallback className="text-sm">{user.name?.charAt(0) || "U"}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user.name || "User"}</p>
                    <p className="text-xs text-muted-foreground">{user.points} pts</p>
                  </div>
                </div>
              ))}
              {currentRank > 3 && (
                <div className="pt-4 border-t">
                  <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/10">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm bg-primary text-primary-foreground">
                      {currentRank}
                    </div>
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="text-sm">You</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <p className="text-sm font-medium">You</p>
                      <p className="text-xs text-muted-foreground">{currentPoints} pts</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="mt-6 p-4 rounded-lg bg-gradient-to-r from-purple-500/10 to-pink-500/10 border border-purple-500/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <p className="text-sm font-semibold text-purple-600 dark:text-purple-400">
                  You're #{currentRank} this week
                </p>
              </div>
              <p className="text-xs text-muted-foreground">Keep engaging to climb the ranks!</p>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
