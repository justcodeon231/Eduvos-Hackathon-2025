"use client"

import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useState } from "react"

const daysOfWeek = ["M", "T", "W", "T", "F", "S", "S"]

export function UpcomingEvents() {
  const [currentMonth] = useState("September 2025")

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = []
    for (let i = 1; i <= 30; i++) {
      days.push(i)
    }
    return days
  }

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Upcoming Events</h2>
        <Badge>Calendar</Badge>
      </div>

      <div className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <span className="font-medium">{currentMonth}</span>
          <div className="flex gap-1">
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-2">
          {daysOfWeek.map((day, i) => (
            <div key={i} className="text-center text-xs font-medium text-muted-foreground py-2">
              {day}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {generateCalendarDays().map((day) => (
            <button
              key={day}
              className="aspect-square flex items-center justify-center text-sm rounded-md hover:bg-accent transition-colors"
            >
              {day}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-3 pt-4 border-t">
        <div className="flex items-start gap-3">
          <div className="w-1 h-12 bg-primary rounded-full" />
          <div className="flex-1">
            <p className="text-sm font-medium">Innovation Kick-Off</p>
            <p className="text-xs text-muted-foreground">September 15, 2025</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1 h-12 bg-chart-2 rounded-full" />
          <div className="flex-1">
            <p className="text-sm font-medium">AI/ML pitch event</p>
            <p className="text-xs text-muted-foreground">September 22, 2025</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <div className="w-1 h-12 bg-chart-3 rounded-full" />
          <div className="flex-1">
            <p className="text-sm font-medium">Submit project by</p>
            <p className="text-xs text-muted-foreground">September 30, 2025</p>
          </div>
        </div>
      </div>
    </Card>
  )
}
