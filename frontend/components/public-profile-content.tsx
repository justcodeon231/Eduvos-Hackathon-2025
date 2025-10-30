"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Trophy, Heart, MessageCircle, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { profileApi, type PublicProfile } from "@/lib/api"
import { Header } from "./header"
import { getCategoryPlaceholder } from "@/lib/api"

interface PublicProfileContentProps {
  userId: number
}

export function PublicProfileContent({ userId }: PublicProfileContentProps) {
  const router = useRouter()
  const [profile, setProfile] = useState<PublicProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await profileApi.getPublicProfile(userId)
        setProfile(data)
      } catch (error) {
        console.error("Failed to fetch profile:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProfile()
  }, [userId])

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="text-center py-20">
          <p className="text-muted-foreground">Profile not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="max-w-5xl mx-auto px-4 py-8">
        <Button variant="ghost" onClick={() => router.back()} className="mb-6 gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Button>

        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-4">
            <Card className="p-6 border-2">
              <div className="flex flex-col items-center text-center">
                <Avatar className="w-24 h-24 mb-4">
                  <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-3xl">
                    {profile.name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h1 className="text-2xl font-bold mb-1">{profile.name}</h1>
                <p className="text-sm text-muted-foreground mb-4">{profile.email}</p>

                <div className="w-full space-y-3">
                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-2">
                      <Trophy className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm font-medium">Rank</span>
                    </div>
                    <span className="font-bold">#{profile.rank}</span>
                  </div>

                  <div className="flex items-center justify-between p-3 bg-secondary rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-primary" />
                      <span className="text-sm font-medium">Points</span>
                    </div>
                    <span className="font-bold">{profile.points}</span>
                  </div>
                </div>
              </div>
            </Card>

            <Card className="p-6 border-2">
              <h3 className="font-bold mb-4">Stats</h3>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Posts</span>
                  <span className="font-semibold">{profile.posts.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Heart className="w-3 h-3" /> Likes Received
                  </span>
                  <span className="font-semibold">{profile.total_likes}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <MessageCircle className="w-3 h-3" /> Comments Received
                  </span>
                  <span className="font-semibold">{profile.total_comments}</span>
                </div>
              </div>
            </Card>
          </div>

          <div className="lg:col-span-2">
            <h2 className="text-xl font-bold mb-4">Posts ({profile.posts.length})</h2>
            <div className="space-y-4">
              {profile.posts.map((post) => (
                <Card
                  key={post.id}
                  onClick={() => router.push(`/posts/${post.id}`)}
                  className="p-5 hover:shadow-lg transition-all cursor-pointer hover:scale-[1.01] border-2"
                >
                  <div className="flex items-start gap-3 mb-3">
                    <Avatar className="w-10 h-10">
                      <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-white text-sm">
                        {post.author.name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm">{post.author.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <img
                    src={getCategoryPlaceholder(post.category) || "/placeholder.svg"}
                    alt={post.title}
                    className="w-full h-48 object-cover rounded-lg mb-3"
                  />

                  <h3 className="font-bold text-lg mb-2">{post.title}</h3>
                  <p className="text-muted-foreground line-clamp-2 mb-3">{post.content}</p>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Heart className="w-4 h-4" />
                      {post.likes}
                    </span>
                    <span className="flex items-center gap-1">
                      <MessageCircle className="w-4 h-4" />
                      {post.comments}
                    </span>
                  </div>
                </Card>
              ))}

              {profile.posts.length === 0 && (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">No posts yet</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
