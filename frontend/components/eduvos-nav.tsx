"use client"

import { useState } from "react"
import { Search, Bell, User, MessageSquare, Menu } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { useRouter, usePathname } from "next/navigation"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { api, type User as UserType } from "@/lib/api"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"

interface EduvosNavProps {
  unreadCount?: number
}

export function EduvosNav({ unreadCount = 0 }: EduvosNavProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const pathname = usePathname()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserType[]>([])
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const navItems = [
    { label: "Home", href: "/home" },
    { label: "Idea Hub", href: "/idea-hub" },
    { label: "Collaboration Rooms", href: "/collaboration-rooms" },
    { label: "Mentorship & Knowledge", href: "/mentorship" },
    { label: "Rewards & Gamification", href: "/rewards" },
  ]

  const handleSearch = async (query: string) => {
    setSearchQuery(query)
    if (query.trim().length > 0) {
      try {
        const results = await api.searchUsers(query)
        setSearchResults(results)
        setShowSearchResults(true)
      } catch (error) {
        console.error("[v0] Search failed:", error)
      }
    } else {
      setSearchResults([])
      setShowSearchResults(false)
    }
  }

  const handleLogout = () => {
    logout()
    router.push("/login")
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <nav className="bg-white border-b border-gray-200 sticky top-0 z-50">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 md:px-6 py-3">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#1E3A8A] flex items-center justify-center">
            <span className="text-white font-bold text-sm">C</span>
          </div>
          <span className="font-bold text-lg text-[#111111] hidden sm:inline">Catalyst</span>
        </div>

        {/* Search Bar - Hidden on mobile */}
        <div className="hidden md:flex flex-1 max-w-md mx-8 relative">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search ideas, projects, people"
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              onFocus={() => searchQuery && setShowSearchResults(true)}
              onBlur={() => setTimeout(() => setShowSearchResults(false), 200)}
              className="pl-10 bg-[#F9FAFB] border-gray-200"
            />
          </div>
          {showSearchResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    window.dispatchEvent(
                      new CustomEvent("openChat", {
                        detail: { userId: result.id, userName: result.name },
                      }),
                    )
                    setShowSearchResults(false)
                    setSearchQuery("")
                  }}
                  className="w-full flex items-center gap-3 p-3 hover:bg-[#F4F8FB] transition-colors text-left"
                >
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-[#005EB8] text-white text-xs">
                      {getInitials(result.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-medium text-sm text-[#111111]">{result.name}</p>
                    <p className="text-xs text-gray-500">{result.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 md:gap-4">
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <button className="md:hidden p-2 hover:bg-[#F4F8FB] rounded-lg transition-colors">
                <Menu className="h-5 w-5 text-gray-600" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[280px] sm:w-[320px]">
              <div className="flex flex-col gap-4 mt-8">
                {navItems.map((item) => (
                  <button
                    key={item.href}
                    onClick={() => {
                      router.push(item.href)
                      setMobileMenuOpen(false)
                    }}
                    className={`text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? "bg-[#1E3A8A] text-white"
                        : "text-gray-600 hover:bg-[#F4F8FB] hover:text-[#005EB8]"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </SheetContent>
          </Sheet>

          <button className="relative p-2 hover:bg-[#F4F8FB] rounded-lg transition-colors hidden sm:flex">
            <MessageSquare className="h-5 w-5 text-gray-600" />
          </button>
          <button className="relative p-2 hover:bg-[#F4F8FB] rounded-lg transition-colors">
            <Bell className="h-5 w-5 text-gray-600" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-4 h-4 bg-[#FF5A5F] text-white text-xs rounded-full flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 p-2 hover:bg-[#F4F8FB] rounded-lg transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-[#005EB8] text-white text-xs">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <User className="h-4 w-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>Logout</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Navigation Links - Hidden on mobile */}
      <div className="hidden md:flex items-center gap-1 px-6 border-t border-gray-100">
        {navItems.map((item) => (
          <button
            key={item.href}
            onClick={() => router.push(item.href)}
            className={`px-4 py-3 text-sm font-medium transition-colors relative ${
              pathname === item.href
                ? "text-[#005EB8] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-0.5 after:bg-[#005EB8]"
                : "text-gray-600 hover:text-[#005EB8]"
            }`}
          >
            {item.label}
          </button>
        ))}
      </div>
    </nav>
  )
}
