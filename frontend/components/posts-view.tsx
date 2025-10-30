"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Heart, MessageCircle, Share2, Plus } from "lucide-react"
import { api, type Post } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface PostsViewProps {
  onRefreshNotifications: () => void
}

export function PostsView({ onRefreshNotifications }: PostsViewProps) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<Post[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewPost, setShowNewPost] = useState(false)
  const [newPostTitle, setNewPostTitle] = useState("")
  const [newPostContent, setNewPostContent] = useState("")
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [commentContent, setCommentContent] = useState("")

  useEffect(() => {
    loadPosts()
  }, [])

  const loadPosts = async () => {
    try {
      const allPosts = await api.getPosts()
      setPosts(allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (error) {
      console.error("[v0] Failed to load posts:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newPostTitle.trim() || !newPostContent.trim()) return

    try {
      await api.createPost(newPostTitle, newPostContent)
      setNewPostTitle("")
      setNewPostContent("")
      setShowNewPost(false)
      loadPosts()
    } catch (error) {
      console.error("[v0] Failed to create post:", error)
    }
  }

  const handleLike = async (postId: number) => {
    try {
      await api.likePost(postId)
      loadPosts()
      onRefreshNotifications()
    } catch (error) {
      console.error("[v0] Failed to like post:", error)
    }
  }

  const handleComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedPost || !commentContent.trim()) return

    try {
      await api.createComment(selectedPost.id, commentContent)
      setCommentContent("")
      loadPosts()
      onRefreshNotifications()
    } catch (error) {
      console.error("[v0] Failed to comment:", error)
    }
  }

  const handleShare = (post: Post) => {
    // Trigger share modal via custom event
    window.dispatchEvent(new CustomEvent("sharePost", { detail: { post } }))
  }

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffMins = Math.floor(diffMs / 60000)
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffMins < 60) return `${diffMins}m ago`
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F9FAFB]">
      <div className="max-w-3xl mx-auto p-6 space-y-4">
        {/* New Post Button */}
        <Dialog open={showNewPost} onOpenChange={setShowNewPost}>
          <DialogTrigger asChild>
            <Button className="w-full bg-[#005EB8] hover:bg-[#003E73] text-white">
              <Plus className="h-4 w-4 mr-2" />
              Create New Post
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Post</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleCreatePost} className="space-y-4">
              <div>
                <label htmlFor="title" className="text-sm font-medium">
                  Title
                </label>
                <Input
                  id="title"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  placeholder="Enter post title..."
                  required
                />
              </div>
              <div>
                <label htmlFor="content" className="text-sm font-medium">
                  Content
                </label>
                <Textarea
                  id="content"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="What's on your mind?"
                  rows={5}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-[#005EB8] hover:bg-[#003E73] text-white">
                Post
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        {/* Posts Feed */}
        {loading ? (
          <div className="text-center py-8 text-gray-500">Loading posts...</div>
        ) : posts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          posts.map((post) => (
            <div key={post.id} className="bg-white rounded-lg border border-gray-200 p-6 space-y-4">
              {/* Post Header */}
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback className="bg-[#005EB8] text-white">{getInitials(post.author.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <p className="font-semibold text-[#111111]">{post.author.name}</p>
                  <p className="text-sm text-gray-500">{formatDate(post.created_at)}</p>
                </div>
              </div>

              {/* Post Content */}
              <div>
                <h3 className="font-bold text-lg text-[#111111] mb-2">{post.title}</h3>
                <p className="text-[#111111] leading-relaxed">{post.content}</p>
              </div>

              {/* Post Actions */}
              <div className="flex items-center gap-6 pt-2 border-t border-gray-100">
                <button
                  onClick={() => handleLike(post.id)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#FFB400] transition-colors"
                >
                  <Heart className="h-5 w-5" />
                  <span className="text-sm font-medium">{post.likes}</span>
                </button>
                <button
                  onClick={() => setSelectedPost(post)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#FF5A5F] transition-colors"
                >
                  <MessageCircle className="h-5 w-5" />
                  <span className="text-sm font-medium">{post.comments}</span>
                </button>
                <button
                  onClick={() => handleShare(post)}
                  className="flex items-center gap-2 text-gray-600 hover:text-[#005EB8] transition-colors"
                >
                  <Share2 className="h-5 w-5" />
                  <span className="text-sm font-medium">Share</span>
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Comment Dialog */}
      <Dialog open={!!selectedPost} onOpenChange={() => setSelectedPost(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Comment</DialogTitle>
          </DialogHeader>
          {selectedPost && (
            <div className="space-y-4">
              <div className="p-4 bg-[#F9FAFB] rounded-lg">
                <p className="font-semibold text-[#111111] mb-1">{selectedPost.title}</p>
                <p className="text-sm text-gray-600">{selectedPost.content}</p>
              </div>
              <form onSubmit={handleComment} className="space-y-4">
                <Textarea
                  value={commentContent}
                  onChange={(e) => setCommentContent(e.target.value)}
                  placeholder="Write your comment..."
                  rows={4}
                  required
                />
                <Button type="submit" className="w-full bg-[#005EB8] hover:bg-[#003E73] text-white">
                  Post Comment
                </Button>
              </form>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
