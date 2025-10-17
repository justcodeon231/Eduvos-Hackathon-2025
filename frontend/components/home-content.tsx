"use client"

import { useState } from "react"
import { Header } from "@/components/header"
import { Navigation } from "@/components/navigation"
import { IdeaSection } from "@/components/idea-section"
import { CommunityHighlights } from "@/components/community-highlights"
import { EngagementFeed } from "@/components/engagement-feed"
import { UpcomingEvents } from "@/components/upcoming-events"
import { Dashboard } from "@/components/dashboard"
import { NotificationsSidebar } from "@/components/notifications-sidebar"

export function HomeContent() {
  const [refreshKey, setRefreshKey] = useState(0)
  const [activeCategory, setActiveCategory] = useState("Home")

  const handlePostCreated = () => {
    setRefreshKey((prev) => prev + 1)
  }

  const handleCategoryChange = (category: string) => {
    setActiveCategory(category)
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <Navigation activeCategory={activeCategory} onCategoryChange={handleCategoryChange} />

      <div className="container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            <IdeaSection onPostCreated={handlePostCreated} />
            <CommunityHighlights />
            <EngagementFeed key={`${refreshKey}-${activeCategory}`} category={activeCategory} />
          </div>

          {/* Right Sidebar - Hidden on mobile, shown on large screens */}
          <div className="hidden lg:block space-y-6 sticky top-20 self-start">
            <UpcomingEvents />
            <Dashboard />
            <NotificationsSidebar />
          </div>
        </div>
      </div>
    </div>
  )
}
