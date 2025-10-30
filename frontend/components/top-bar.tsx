"use client"

import { useState, useEffect, useRef } from "react"
import { Bell, Search, LogOut, Settings } from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { api, type User as UserType } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRouter } from "next/navigation"

interface TopBarProps {
  onNotificationClick: () => void
  unreadCount: number
}

export function TopBar({ onNotificationClick, unreadCount }: TopBarProps) {
  const { user, logout } = useAuth()
  const router = useRouter()
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<UserType[]>([])
  const [showResults, setShowResults] = useState(false)
  const searchRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false)
      }
    }

    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [])

  useEffect(() => {
    const searchUsers = async () => {
      if (searchQuery.trim().length > 0) {
        try {
          const results = await api.searchUsers(searchQuery)
          setSearchResults(results)
          setShowResults(true)
        } catch (error) {
          console.error("[v0] Search failed:", error)
        }
      } else {
        setSearchResults([])
        setShowResults(false)
      }
    }

    const debounce = setTimeout(searchUsers, 300)
    return () => clearTimeout(debounce)
  }, [searchQuery])

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
    <header className="sticky top-0 z-50 w-full border-b bg-[#005EB8] text-white">
      <div className="flex h-16 items-center px-6 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2 min-w-[200px]">
          <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
            <span className="text-[#005EB8] font-bold text-lg">C</span>
          </div>
          <span className="font-bold text-xl">Catalyst</span>
        </div>

        {/* Search Bar */}
        <div className="flex-1 max-w-2xl relative" ref={searchRef}>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/10 border-white/20 text-white placeholder:text-white/60 focus:bg-white focus:text-[#111111] focus:placeholder:text-gray-400"
            />
          </div>

          {/* Search Results Dropdown */}
          {showResults && searchResults.length > 0 && (
            <div className="absolute top-full mt-2 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto">
              {searchResults.map((result) => (
                <button
                  key={result.id}
                  onClick={() => {
                    setShowResults(false)
                    setSearchQuery("")
                    // Navigate to DM with this user
                    window.dispatchEvent(
                      new CustomEvent("openChat", {
                        detail: { userId: result.id, userName: result.name },
                      }),
                    )
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors text-left"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#CCE5FF] text-[#005EB8]">{getInitials(result.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[#111111] truncate">{result.name}</p>
                    <p className="text-sm text-gray-500 truncate">{result.email}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          {/* Notifications */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onNotificationClick}
            className="relative hover:bg-white/10 text-white"
          >
            <Bell className="h-5 w-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-[#FFB400] text-[#111111] text-xs font-bold flex items-center justify-center">
                {unreadCount > 9 ? "9+" : unreadCount}
              </span>
            )}
          </Button>

          {/* Profile Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 hover:bg-white/10 text-white">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-white text-[#005EB8]">
                    {user ? getInitials(user.name) : "U"}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:inline-block font-medium">{user?.name}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => window.dispatchEvent(new CustomEvent("openProfileSettings"))}>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="text-[#FF5A5F]">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
