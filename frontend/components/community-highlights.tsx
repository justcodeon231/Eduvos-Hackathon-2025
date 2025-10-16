"use client"

import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users } from "lucide-react"
import Image from "next/image"

const highlights = [
  {
    id: 1,
    title: "Insight's Top Influencer: Shogi",
    description: "Explore how Shogi has become one of the most influential voices in our community.",
    image: "/business-meeting-collaboration.png",
    author: "Reference Library",
    tags: ["#Innovation", "#Influencer Of Week"],
  },
  {
    id: 2,
    title: "Hackathon",
    description: "Join us at our annual hackathon where innovation meets collaboration.",
    image: "/team-collaboration.png",
    author: "Reference Library",
    tags: ["#Innovation", "#24 Hour"],
  },
  {
    id: 3,
    title: "Team's to participate in 24 hours",
    description: "Register your team for the upcoming 24-hour innovation challenge.",
    image: "/business-handshake.png",
    author: "EDUVOS ADMIN",
    tags: ["#Ideathon", "#Inspiration"],
  },
  {
    id: 4,
    title: "From Idea to Industry",
    description: "A comprehensive guide on transforming your innovative ideas into market-ready solutions.",
    image: "/team-workshop.png",
    author: "EDUVOS ADMIN",
    tags: ["#Brainstorm", "#Community"],
  },
]

export function CommunityHighlights() {
  return (
    <div>
      <h2 className="text-xl font-semibold mb-4">Community Highlights</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {highlights.map((highlight) => (
          <Card key={highlight.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="relative h-40 bg-muted">
              <Image src={highlight.image || "/placeholder.svg"} alt={highlight.title} fill className="object-cover" />
            </div>
            <div className="p-4">
              <div className="flex items-center gap-2 mb-2 text-xs text-muted-foreground">
                <Users className="w-3 h-3" />
                <span>{highlight.author}</span>
              </div>
              <h3 className="font-semibold mb-2 line-clamp-1">{highlight.title}</h3>
              <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{highlight.description}</p>
              <div className="flex flex-wrap gap-2">
                {highlight.tags.map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
