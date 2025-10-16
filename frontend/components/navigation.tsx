"use client"

import { cn } from "@/lib/utils"

const navItems = [
  "Home",
  "Ideas Hub",
  "Collaborate/Brainstorm",
  "Resources/Gamification",
  "Research Guardians",
  "Forum",
]

interface NavigationProps {
  activeCategory: string
  onCategoryChange: (category: string) => void
}

export function Navigation({ activeCategory, onCategoryChange }: NavigationProps) {
  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => onCategoryChange(item)}
              className={cn(
                "py-4 px-2 text-sm font-medium whitespace-nowrap border-b-2 transition-colors",
                activeCategory === item
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
    </nav>
  )
}
