"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import Image from "next/image"
import { postsApi, type Post } from "@/lib/api"

export function CommunityHighlights() {
  const [highlights, setHighlights] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    loadHighlights()
  }, [])

  const loadHighlights = async () => {
    try {
      setIsLoading(true)
      const data = await postsApi.getHighlights()
      setHighlights(data)
    } catch (err) {
      console.error("[v0] Failed to load highlights:", err)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div>
        <h2 className="text-xl font-semibold mb-4">Community Highlights</h2>
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        </div>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Community Highlights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {highlights.map((highlight) => (
          <Card key={highlight.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-40 bg-muted">
              <Image src="/placeholder.svg?height=160&width=400" alt={highlight.title} fill className="object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{highlight.author.name}</span>
              </div>
              <h3 className="font-semibold mb-2 line-clamp-1">{highlight.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{highlight.content}</p>
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="text-xs">
                  {highlight.category}
                </Badge>
                <Badge variant="outline" className="text-xs">
                  {highlight.likes} likes
                </Badge>
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
