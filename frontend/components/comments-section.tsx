"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Trash2 } from "lucide-react"
import { postsApi, type Comment } from "@/lib/api"
import { useAuth } from "@/contexts/auth-context"

interface CommentsSectionProps {
  postId: number
  onCommentAdded: () => void
}

export function CommentsSection({ postId, onCommentAdded }: CommentsSectionProps) {
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const { user } = useAuth()

  useEffect(() => {
    loadComments()
  }, [postId])

  const loadComments = async () => {
    try {
      setIsLoading(true)
      const data = await postsApi.getComments(postId)
      setComments(data)
    } catch (err) {
      console.error("[v0] Failed to load comments:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newComment.trim()) return

    try {
      setIsSubmitting(true)
      const comment = await postsApi.createComment({
        post_id: postId,
        content: newComment,
      })
      setComments((prev) => [comment, ...prev])
      setNewComment("")
      onCommentAdded()
    } catch (err) {
      console.error("[v0] Failed to post comment:", err)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (commentId: number) => {
    try {
      await postsApi.deleteComment(commentId)
      setComments((prev) => prev.filter((c) => c.id !== commentId))
      onCommentAdded()
    } catch (err) {
      console.error("[v0] Failed to delete comment:", err)
    }
  }

  return (
    <div className="mt-4 pt-4 border-t space-y-4">
      <form onSubmit={handleSubmit} className="space-y-2">
        <Textarea
          placeholder="Write a comment..."
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          disabled={isSubmitting}
          rows={2}
        />
        <Button type="submit" size="sm" disabled={isSubmitting || !newComment.trim()}>
          {isSubmitting ? "Posting..." : "Post Comment"}
        </Button>
      </form>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Loading comments...</p>
      ) : (
        <div className="space-y-3">
          {comments.map((comment) => (
            <div key={comment.id} className="flex gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src="/placeholder.svg" />
                <AvatarFallback>U</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <div className="bg-muted rounded-lg p-3">
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-sm">User {comment.user_id}</p>
                    {user && user.id === comment.user_id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleDelete(comment.id)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1">{comment.content}</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{new Date(comment.created_at).toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
