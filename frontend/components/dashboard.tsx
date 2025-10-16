"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { ThumbsUp, MessageSquare, FileText } from "lucide-react"
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
      icon: FileText,
      label: "Posts",
      value: stats?.totalPosts || 0,
    },
    {
      icon: ThumbsUp,
      label: "Likes",
      value: stats?.totalLikes || 0,
    },
    {
      icon: MessageSquare,
      label: "Comments",
      value: stats?.totalComments || 0,
    },
  ]

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Your Dashboard</h2>
        <Button variant="link" size="sm" asChild className="text-primary p-0 h-auto">
          <Link href="/dashboard">View Full</Link>
        </Button>
      </div>
      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-6 h-6 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {displayStats.map((stat) => (
            <div key={stat.label} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                  <stat.icon className="w-5 h-5 text-primary" />
                </div>
                <span className="text-sm font-medium">{stat.label}</span>
              </div>
              <span className="text-lg font-semibold">{stat.value}</span>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
