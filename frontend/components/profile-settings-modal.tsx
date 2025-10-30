"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { api } from "@/lib/api"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"

interface ProfileSettingsModalProps {
  open: boolean
  onClose: () => void
}

export function ProfileSettingsModal({ open, onClose }: ProfileSettingsModalProps) {
  const { user, refreshUser, logout } = useAuth()
  const router = useRouter()
  const [name, setName] = useState(user?.name || "")
  const [loading, setLoading] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim() || loading) return

    setLoading(true)
    try {
      await api.updateProfile(name)
      await refreshUser()
      onClose()
    } catch (error) {
      console.error("[v0] Failed to update profile:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteAccount = async () => {
    setLoading(true)
    try {
      await api.deleteProfile()
      logout()
      router.push("/login")
    } catch (error) {
      console.error("[v0] Failed to delete account:", error)
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
          <DialogTitle>Profile Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Profile Avatar */}
          <div className="flex flex-col items-center gap-4">
            <Avatar className="h-24 w-24">
              <AvatarFallback className="bg-[#005EB8] text-white text-2xl">
                {user ? getInitials(user.name) : "U"}
              </AvatarFallback>
            </Avatar>
            <div className="text-center">
              <p className="font-semibold text-lg">{user?.name}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          {/* Update Name Form */}
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div>
              <label htmlFor="name" className="text-sm font-medium mb-2 block">
                Display Name
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter your name"
                required
              />
            </div>
            <Button type="submit" disabled={loading} className="w-full bg-[#005EB8] hover:bg-[#003E73] text-white">
              {loading ? "Updating..." : "Update Profile"}
            </Button>
          </form>

          {/* Delete Account */}
          <div className="pt-4 border-t border-gray-200">
            {!showDeleteConfirm ? (
              <Button
                variant="outline"
                onClick={() => setShowDeleteConfirm(true)}
                className="w-full text-[#FF5A5F] border-[#FF5A5F] hover:bg-[#FF5A5F] hover:text-white"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Account
              </Button>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-center text-gray-600">Are you sure? This action cannot be undone.</p>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button
                    onClick={handleDeleteAccount}
                    disabled={loading}
                    className="flex-1 bg-[#FF5A5F] hover:bg-[#FF5A5F]/90 text-white"
                  >
                    {loading ? "Deleting..." : "Confirm Delete"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
