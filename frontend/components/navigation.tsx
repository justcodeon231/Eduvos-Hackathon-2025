"use client"

import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"

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
  const router = useRouter()

  const handleNavClick = (item: string) => {
    if (item === "Forum") {
      router.push("/forum")
    } else {
      onCategoryChange(item)
    }
  }

  return (
    <nav className="border-b bg-card">
      <div className="container mx-auto px-4">
        <div className="flex items-center gap-6 overflow-x-auto">
          {navItems.map((item) => (
            <button
              key={item}
              onClick={() => handleNavClick(item)}
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
