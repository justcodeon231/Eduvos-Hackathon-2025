"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Share2, Bookmark } from "lucide-react"
import { postsApi, type FeedPost } from "@/lib/api"
import { CommentsSection } from "@/components/comments-section"

interface EngagementFeedProps {
  category?: string
  onRefresh?: () => void
}

export function EngagementFeed({ category, onRefresh }: EngagementFeedProps) {
  const [posts, setPosts] = useState<FeedPost[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set())
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set())
  const limit = 10

  useEffect(() => {
    setPosts([])
    setOffset(0)
    setHasMore(true)
    loadPosts(true)
  }, [category])

  const loadPosts = async (reset = false) => {
    try {
      setIsLoading(true)
      const currentOffset = reset ? 0 : offset
      const categoryMap: Record<string, string> = {
        Home: "",
        "Ideas Hub": "ideas",
        "Collaborate/Brainstorm": "collaborate",
        "Resources/Gamification": "resources",
        "Research Guardians": "research",
        Forum: "forum",
      }
      const categoryFilter = category ? categoryMap[category] || category.toLowerCase() : undefined
      const newPosts = await postsApi.getFeed(categoryFilter, currentOffset, limit)

      setPosts((prev) => (reset ? newPosts : [...prev, ...newPosts]))
      setHasMore(newPosts.length === limit)
      setOffset(currentOffset + limit)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load posts")
    } finally {
      setIsLoading(false)
    }
  }

  const handleLike = async (postId: number) => {
    try {
      await postsApi.likePost(postId)

      setLikedPosts((prev) => {
        const newSet = new Set(prev)
        if (newSet.has(postId)) {
          newSet.delete(postId)
        } else {
          newSet.add(postId)
        }
        return newSet
      })

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                likes: likedPosts.has(postId) ? post.likes - 1 : post.likes + 1,
              }
            : post,
        ),
      )
    } catch (err) {
      console.error("[v0] Failed to like post:", err)
    }
  }

  const toggleComments = (postId: number) => {
    setExpandedComments((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
      } else {
        newSet.add(postId)
      }
      return newSet
    })
  }

  const handleCommentAdded = (postId: number) => {
    setPosts((prev) => prev.map((post) => (post.id === postId ? { ...post, comments: post.comments + 1 } : post)))
  }

  if (error) {
    return (
      <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    )
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">{category === "Home" ? "Latest Engagements" : `${category} Posts`}</h2>
      </div>

      {isLoading && posts.length === 0 ? (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading posts...</p>
        </div>
      ) : posts.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">No posts found in this category.</p>
        </Card>
      ) : (
        <div className="space-y-4">
          {posts.map((post) => (
            <Card key={post.id} className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <Avatar>
                  <AvatarImage src="/placeholder.svg" />
                  <AvatarFallback>{post.author.name[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{post.author.name}</p>
                      <p className="text-xs text-muted-foreground">{new Date(post.created_at).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
              <p className="text-muted-foreground mb-4">{post.content}</p>

              {post.category && (
                <div className="flex flex-wrap gap-2 mb-4">
                  <Badge variant="outline">{post.category}</Badge>
                </div>
              )}

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleLike(post.id)}>
                  <ThumbsUp className={`w-4 h-4 ${likedPosts.has(post.id) ? "fill-primary text-primary" : ""}`} />
                  {post.likes}
                </Button>
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => toggleComments(post.id)}>
                  <MessageSquare className="w-4 h-4" />
                  {post.comments}
                </Button>
                <Button variant="ghost" size="sm" className="gap-2 ml-auto">
                  <Share2 className="w-4 h-4" />
                </Button>
              </div>

              {expandedComments.has(post.id) && (
                <CommentsSection postId={post.id} onCommentAdded={() => handleCommentAdded(post.id)} />
              )}
            </Card>
          ))}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full bg-transparent"
              onClick={() => loadPosts(false)}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "Load More"}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
