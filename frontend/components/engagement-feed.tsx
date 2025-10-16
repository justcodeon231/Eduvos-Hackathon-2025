"use client"

import { useState, useEffect } from "react"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ThumbsUp, MessageSquare, Share2, Bookmark } from "lucide-react"
import { postsApi, type Post } from "@/lib/api"
import { CommentsSection } from "@/components/comments-section"

interface EngagementFeedProps {
  category?: string
}

export function EngagementFeed({ category }: EngagementFeedProps) {
  const [posts, setPosts] = useState<Post[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(true)
  const [expandedComments, setExpandedComments] = useState<Set<string>>(new Set())
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
      const categoryFilter = category === "Home" ? undefined : category
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

  const handleLike = async (postId: string, isLiked: boolean) => {
    try {
      if (isLiked) {
        await postsApi.unlikePost(postId)
      } else {
        await postsApi.likePost(postId)
      }

      setPosts((prev) =>
        prev.map((post) =>
          post.id === postId
            ? {
                ...post,
                isLiked: !isLiked,
                likes: isLiked ? post.likes - 1 : post.likes + 1,
              }
            : post,
        ),
      )
    } catch (err) {
      console.error("[v0] Failed to like post:", err)
    }
  }

  const toggleComments = (postId: string) => {
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

  const handleCommentAdded = (postId: string) => {
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
                  <AvatarImage src={post.userAvatar || "/placeholder.svg"} />
                  <AvatarFallback>{post.userName[0]}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{post.userName}</p>
                      <p className="text-xs text-muted-foreground">{new Date(post.createdAt).toLocaleString()}</p>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Bookmark className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <h3 className="font-semibold text-lg mb-2">{post.title}</h3>
              <p className="text-muted-foreground mb-4">{post.content}</p>

              <div className="flex flex-wrap gap-2 mb-4">
                {post.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    {tag}
                  </Badge>
                ))}
              </div>

              <div className="flex items-center gap-4 pt-4 border-t">
                <Button variant="ghost" size="sm" className="gap-2" onClick={() => handleLike(post.id, post.isLiked)}>
                  <ThumbsUp className={`w-4 h-4 ${post.isLiked ? "fill-primary text-primary" : ""}`} />
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
