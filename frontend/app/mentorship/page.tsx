"use client"

import { useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { EduvosNav } from "@/components/eduvos-nav"
import { Card, CardContent } from "@/components/ui/card"

export default function MentorshipPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-[#005EB8] border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-[#F9FAFB]">
      <EduvosNav />
      <div className="max-w-5xl mx-auto p-6">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold text-[#111111] mb-4">Mentorship & Knowledge</h1>
            <p className="text-gray-600">Coming soon - Connect with mentors and share knowledge with peers.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
