"use client"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { FileText, Users, StickyNote } from "lucide-react"
import { CreatePostModal } from "@/components/create-post-modal"

interface IdeaSectionProps {
  onPostCreated: () => void
}

export function IdeaSection({ onPostCreated }: IdeaSectionProps) {
  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Write a new idea</h2>
        <span className="text-sm text-muted-foreground">Share your thoughts, insights, or updates</span>
      </div>

      <div className="flex items-center gap-3">
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <FileText className="w-4 h-4" />
          All
        </Button>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <Users className="w-4 h-4" />
          Team
        </Button>
        <Button variant="outline" size="sm" className="gap-2 bg-transparent">
          <StickyNote className="w-4 h-4" />
          Notes
        </Button>
        <div className="ml-auto">
          <CreatePostModal onPostCreated={onPostCreated} />
        </div>
      </div>
    </Card>
  )
}
