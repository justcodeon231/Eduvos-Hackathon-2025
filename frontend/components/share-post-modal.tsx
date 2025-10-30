"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { api, type User, type Post } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useAuth } from "@/lib/auth-context"

interface SharePostModalProps {
  open: boolean
  onClose: () => void
  post: Post | null
  onSuccess: () => void
}

export function SharePostModal({ open, onClose, post, onSuccess }: SharePostModalProps) {
  const { user: currentUser } = useAuth()
  const [users, setUsers] = useState<User[]>([])
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [message, setMessage] = useState("")
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open])

  const loadUsers = async () => {
    try {
      const allUsers = await api.searchUsers("")
      setUsers(allUsers.filter((u) => u.id !== currentUser?.id))
    } catch (error) {
      console.error("[v0] Failed to load users:", error)
    }
  }

  const handleShare = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedUser || !post || loading) return

    setLoading(true)
    try {
      await api.sharePost(selectedUser.id, post.id, message)
      setMessage("")
      setSelectedUser(null)
      onSuccess()
      onClose()
    } catch (error) {
      console.error("[v0] Failed to share post:", error)
    } finally {
      setLoading(false)
    }
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
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Post via DM</DialogTitle>
        </DialogHeader>

        {post && (
          <div className="space-y-4">
            {/* Post Preview */}
            <div className="p-3 bg-[#F9FAFB] rounded-lg border border-gray-200">
              <p className="font-semibold text-sm text-[#111111] mb-1">{post.title}</p>
              <p className="text-xs text-gray-600 line-clamp-2">{post.content}</p>
            </div>

            {/* Select User */}
            <div>
              <label className="text-sm font-medium mb-2 block">Send to:</label>
              <div className="max-h-48 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-200">
                {users.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user)}
                    className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition-colors text-left ${
                      selectedUser?.id === user.id ? "bg-[#CCE5FF]" : ""
                    }`}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-[#005EB8] text-white text-xs">
                        {getInitials(user.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm text-[#111111] truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Optional Message */}
            <div>
              <label htmlFor="share-message" className="text-sm font-medium mb-2 block">
                Add a message (optional):
              </label>
              <Textarea
                id="share-message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Say something about this post..."
                rows={3}
              />
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} className="flex-1 bg-transparent">
                Cancel
              </Button>
              <Button
                onClick={handleShare}
                disabled={!selectedUser || loading}
                className="flex-1 bg-[#005EB8] hover:bg-[#003E73] text-white"
              >
                {loading ? "Sharing..." : "Share"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
