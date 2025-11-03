"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { EduvosNav } from "@/components/eduvos-nav"
import { Compass, TrendingUp, Clock, Hash, ImageIcon, Heart, MessageCircle, Share2, Bookmark } from "lucide-react"
import { api, type Post } from "@/lib/api"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { useAppStore } from "@/lib/store"

export default function IdeaHubPage() {
  const { user, loading } = useAuth()
  const router = useRouter()
  const { activeIdeaHubTab, setActiveIdeaHubTab, setSelectedView, unreadNotifications } = useAppStore()
  const [posts, setPosts] = useState<Post[]>([])
  const [newPostContent, setNewPostContent] = useState("")
  const [showCommentDialog, setShowCommentDialog] = useState(false)
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [commentContent, setCommentContent] = useState("")

  useEffect(() => {
    setSelectedView("idea-hub")
  }, [setSelectedView])

  useEffect(() => {
    if (!loading && !user) {
      router.push("/login")
    }
  }, [user, loading, router])

  useEffect(() => {
    if (user) {
      loadPosts()
    }
  }, [user])

  const loadPosts = async () => {
    try {
      const allPosts = await api.getPosts()
      setPosts(allPosts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()))
    } catch (error) {
      console.error("[v0] Failed to load posts:", error)
    }
  }

  const handleCreatePost = async () => {
    if (!newPostContent.trim()) return

    try {
      await api.createPost("New Idea", newPostContent)
      setNewPostContent("")
      loadPosts()
    } catch (error) {
      console.error("[v0] Failed to create post:", error)
    }
  }

  const handleLike = async (postId: number) => {
    try {
      await api.likePost(postId)
      loadPosts()
    } catch (error) {
      console.error("[v0] Failed to like post:", error)
    }
  }

  const handleComment = async () => {
    if (!selectedPost || !commentContent.trim()) return

    try {
      await api.createComment(selectedPost.id, commentContent)
      setCommentContent("")
      setShowCommentDialog(false)
      setSelectedPost(null)
      loadPosts()
    } catch (error) {
      console.error("[v0] Failed to comment:", error)
    }
  }

  const handleShare = (post: Post) => {
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

  const formatTime = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / 3600000)
    const diffDays = Math.floor(diffMs / 86400000)

    if (diffHours < 1) return "Just now"
    if (diffHours < 24) return `${diffHours}h ago`
    if (diffDays < 7) return `${diffDays}d ago`
    return date.toLocaleDateString()
  }

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
      <EduvosNav unreadCount={unreadNotifications} />

      <div className="max-w-7xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-4 md:space-y-6">
            {/* Tab Navigation */}
            <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 overflow-x-auto">
              <button
                onClick={() => setActiveIdeaHubTab("discovery")}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeIdeaHubTab === "discovery"
                    ? "bg-[#F4F8FB] text-[#005EB8]"
                    : "text-gray-600 hover:text-[#005EB8]"
                }`}
              >
                <Compass className="h-4 w-4" />
                Discovery
              </button>
              <button
                onClick={() => setActiveIdeaHubTab("trending")}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeIdeaHubTab === "trending" ? "bg-[#1E3A8A] text-white" : "text-gray-600 hover:text-[#005EB8]"
                }`}
              >
                <TrendingUp className="h-4 w-4" />
                Trending
              </button>
              <button
                onClick={() => setActiveIdeaHubTab("recent")}
                className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-md text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                  activeIdeaHubTab === "recent" ? "bg-[#F4F8FB] text-[#005EB8]" : "text-gray-600 hover:text-[#005EB8]"
                }`}
              >
                <Clock className="h-4 w-4" />
                Recent
              </button>
            </div>

            {/* Share an Idea Card */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#111111] mb-4 text-sm md:text-base">Share an Idea</h3>
                <div className="flex items-start gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-[#005EB8] text-white">{getInitials(user.name)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <Textarea
                      value={newPostContent}
                      onChange={(e) => setNewPostContent(e.target.value)}
                      placeholder="Post an idea, question, or research note..."
                      className="min-h-[80px] resize-none border-gray-200 text-sm md:text-base"
                    />
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Button variant="ghost" size="sm" className="text-[#005EB8] text-xs md:text-sm">
                          <Hash className="h-4 w-4 mr-1" />
                          Tag
                        </Button>
                        <Button variant="ghost" size="sm" className="text-[#005EB8] text-xs md:text-sm">
                          <ImageIcon className="h-4 w-4 mr-1" />
                          Media
                        </Button>
                      </div>
                      <Button
                        onClick={handleCreatePost}
                        disabled={!newPostContent.trim()}
                        className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-xs md:text-sm"
                      >
                        Post
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.map((post) => (
                <Card key={post.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3 mb-4">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-[#005EB8] text-white">
                          {getInitials(post.author.name)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-semibold text-[#111111] text-sm md:text-base">{post.author.name}</p>
                            <p className="text-xs md:text-sm text-gray-500">
                              {post.author.email.split("@")[0]} • {formatTime(post.created_at)}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mb-4">
                      <h3 className="font-bold text-base md:text-lg text-[#111111] mb-2">{post.title}</h3>
                      <p className="text-[#111111] leading-relaxed text-sm md:text-base">{post.content}</p>
                    </div>

                    <div className="flex items-center gap-1 mb-4">
                      <span className="text-xs px-2 py-1 bg-[#CCE5FF] text-[#005EB8] rounded-full">#Health</span>
                    </div>

                    <div className="flex items-center gap-4 md:gap-6 pt-3 border-t border-gray-100">
                      <button
                        onClick={() => handleLike(post.id)}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#FFB400] transition-colors"
                      >
                        <Heart className="h-4 md:h-5 w-4 md:w-5" />
                        <span className="text-xs md:text-sm font-medium">{post.likes}</span>
                      </button>
                      <button
                        onClick={() => {
                          setSelectedPost(post)
                          setShowCommentDialog(true)
                        }}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#FF5A5F] transition-colors"
                      >
                        <MessageCircle className="h-4 md:h-5 w-4 md:w-5" />
                        <span className="text-xs md:text-sm font-medium">{post.comments}</span>
                      </button>
                      <button
                        onClick={() => handleShare(post)}
                        className="flex items-center gap-2 text-gray-600 hover:text-[#005EB8] transition-colors"
                      >
                        <Share2 className="h-4 md:h-5 w-4 md:w-5" />
                      </button>
                      <button className="flex items-center gap-2 text-gray-600 hover:text-[#005EB8] transition-colors ml-auto">
                        <Bookmark className="h-4 md:h-5 w-4 md:w-5" />
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Right Sidebar */}
          <div className="space-y-4 md:space-y-6">
            {/* Upcoming Events */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#111111] mb-4 text-sm md:text-base">Upcoming Events</h3>
                <div className="space-y-3">
                  <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[#005EB8] mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111111]">Hackathon</p>
                      <p className="text-xs text-gray-500">Fri 5 PM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[#005EB8] mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111111]">Pitch workshop reminder</p>
                      <p className="text-xs text-gray-500">Sat 10 AM</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3 p-3 bg-[#F9FAFB] rounded-lg">
                    <div className="w-2 h-2 rounded-full bg-[#005EB8] mt-1.5"></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[#111111]">Submit sprint demo</p>
                      <p className="text-xs text-gray-500">Tue 6 PM</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Connect & Collaborate */}
            <Card>
              <CardContent className="pt-6">
                <h3 className="font-semibold text-[#111111] mb-4 text-sm md:text-base">Connect & Collaborate</h3>
                <div className="space-y-3">
                  {["Prof. Rivera", "Lina Patel", "Dr. Ndlovu"].map((name, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarFallback className="bg-[#005EB8] text-white text-xs">
                            {name
                              .split(" ")
                              .map((n) => n[0])
                              .join("")}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium text-[#111111]">{name}</p>
                          <p className="text-xs text-gray-500">
                            {i === 0 ? "AI mentor" : i === 1 ? "UX student" : "Sustainability Strategist"}
                          </p>
                        </div>
                      </div>
                      <Button size="sm" className="bg-[#1E3A8A] hover:bg-[#1E3A8A]/90 text-white text-xs md:text-sm">
                        Connect
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Comment Dialog */}
      <Dialog open={showCommentDialog} onOpenChange={setShowCommentDialog}>
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
              <Textarea
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                placeholder="Write your comment..."
                rows={4}
              />
              <Button onClick={handleComment} className="w-full bg-[#005EB8] hover:bg-[#003E73] text-white">
                Post Comment
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
