"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Share2, Bookmark } from "lucide-react"
import { postsApi, type FeedPost, getCategoryPlaceholder } from "@/lib/api"
import { CommentsSection } from "@/components/comments-section"
import Image from "next/image"

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
  const [expandedPosts, setExpandedPosts] = useState<Set<number>>(new Set())
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
      console.error("Failed to like post:", err)
    }
  }

  const toggleExpand = (postId: number) => {
    setExpandedPosts((prev) => {
      const newSet = new Set(prev)
      if (newSet.has(postId)) {
        newSet.delete(postId)
        setExpandedComments((prevComments) => {
          const newComments = new Set(prevComments)
          newComments.delete(postId)
          return newComments
        })
      } else {
        newSet.add(postId)
        setExpandedComments((prevComments) => new Set(prevComments).add(postId))
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
          {posts.map((post) => {
            const isExpanded = expandedPosts.has(post.id)
            const shouldTruncate = post.content.length > 200
            const displayContent = isExpanded || !shouldTruncate ? post.content : post.content.slice(0, 200) + "..."

            return (
              <Card
                key={post.id}
                className="overflow-hidden bg-white shadow-sm hover:shadow-lg transition-all duration-300 border border-gray-100 animate-fade-in"
              >
                <div className="relative h-48 w-full bg-gradient-to-br from-primary/10 to-primary/5">
                  <Image
                    src={getCategoryPlaceholder(post.category) || "/placeholder.svg"}
                    alt={post.title}
                    fill
                    className="object-cover"
                  />
                </div>

                <div className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <Avatar className="w-10 h-10 ring-2 ring-primary/10 transition-transform hover:scale-110">
                        <AvatarImage src="/placeholder.svg" />
                        <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/10 text-primary font-semibold">
                          {post.author.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-semibold text-sm text-foreground">{post.author.name}</p>
                        <p className="text-xs text-muted-foreground">
                          Posted an Idea • {new Date(post.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 mb-2">
                    <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 flex-shrink-0" />
                    <h3 className="font-bold text-lg text-foreground leading-tight">{post.title}</h3>
                  </div>

                  <p className="text-sm text-muted-foreground mb-2 leading-relaxed whitespace-pre-wrap">
                    {displayContent}
                  </p>

                  {shouldTruncate && (
                    <Button
                      variant="link"
                      size="sm"
                      className="p-0 h-auto text-blue-600 hover:text-blue-700 font-medium mb-3 transition-colors"
                      onClick={() => toggleExpand(post.id)}
                    >
                      {isExpanded ? "Show less" : "Read more"}
                    </Button>
                  )}

                  {post.category && (
                    <div className="flex flex-wrap gap-2 mb-4">
                      <Badge
                        variant="outline"
                        className="text-blue-600 border-blue-600 bg-blue-50 hover:bg-blue-100 transition-colors"
                      >
                        #{post.category}
                      </Badge>
                    </div>
                  )}

                  <div className="flex items-center gap-1 pt-4 border-t border-border">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 hover:bg-primary/5 transition-all hover:scale-105"
                      onClick={() => handleLike(post.id)}
                    >
                      <ThumbsUp
                        className={`w-4 h-4 transition-all ${likedPosts.has(post.id) ? "fill-primary text-primary scale-110" : ""}`}
                      />
                      <span className="font-medium">{post.likes}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="gap-2 hover:bg-primary/5 transition-all hover:scale-105"
                      onClick={() => toggleExpand(post.id)}
                    >
                      <MessageSquare className="w-4 h-4" />
                      <span className="font-medium">{post.comments}</span>
                    </Button>
                    <div className="flex-1" />
                    <Button variant="ghost" size="sm" className="hover:bg-primary/5 transition-all hover:scale-105">
                      <Share2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" className="hover:bg-primary/5 transition-all hover:scale-105">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-border animate-slide-down">
                      <CommentsSection postId={post.id} onCommentAdded={() => handleCommentAdded(post.id)} />
                    </div>
                  )}
                </div>
              </Card>
            )
          })}

          {hasMore && (
            <Button
              variant="outline"
              className="w-full bg-gradient-to-r from-primary/5 to-primary/10 hover:from-primary/10 hover:to-primary/20 transition-all"
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
