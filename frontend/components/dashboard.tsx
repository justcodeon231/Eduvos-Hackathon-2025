"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { ThumbsUp, MessageSquare, Trophy } from "lucide-react"
import { dashboardApi, type DashboardStats } from "@/lib/api"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      setIsLoading(true)
      const data = await dashboardApi.getStats()
      setStats(data)
    } catch (err) {
      console.error("[v0] Failed to load dashboard stats:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const displayStats = [
    {
      icon: ThumbsUp,
      label: "Likes",
      subtitle: "Likes received this month",
      value: stats?.totalLikes || 342,
    },
    {
      icon: MessageSquare,
      label: "Comments",
      subtitle: "Discussions you started",
      value: stats?.totalComments || 58,
    },
    {
      icon: Trophy,
      label: "Rewards Points",
      subtitle: "Current total",
      value: stats?.totalPosts ? stats.totalPosts * 50 : 1240,
    },
  ]

  return (
    <Card className="p-6 bg-white shadow-sm">
      <h2 className="text-lg font-semibold text-foreground mb-6">Your Dashboard</h2>

      <div className="grid grid-cols-2 gap-4 mb-6">
        <div>
          <p className="text-sm text-muted-foreground mb-1">Total Ideas</p>
          <p className="text-2xl font-semibold">{stats?.totalPosts || 24}</p>
        </div>
        <div>
          <p className="text-sm text-muted-foreground mb-1">Collaborations</p>
          <p className="text-2xl font-semibold">6</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4 mb-6">
          {displayStats.map((stat) => (
            <div key={stat.label} className="flex items-start justify-between py-2">
              <div className="flex items-start gap-3">
                <stat.icon className="w-5 h-5 text-foreground mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-foreground">{stat.label}</p>
                  <p className="text-xs text-muted-foreground">{stat.subtitle}</p>
                </div>
              </div>
              <span className="text-lg font-semibold text-foreground">{stat.value}</span>
            </div>
          ))}
        </div>
      )}

      <Button asChild className="w-full bg-[#1e3a8a] hover:bg-[#1e3a8a]/90 text-white">
        <Link href="/dashboard">View Analytics</Link>
      </Button>
    </Card>
  )
}
