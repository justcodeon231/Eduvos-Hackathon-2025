"use client"

import type React from "react"
import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { postsApi } from "@/lib/api"
import { Sparkles, Hash, X } from "lucide-react"
import { cn } from "@/lib/utils"

interface CreatePostModalProps {
  onPostCreated: () => void
}

const categories = [
  { value: "ideas", label: "Ideas Hub", color: "bg-blue-500", icon: "💡" },
  { value: "collaborate", label: "Collaborate", color: "bg-purple-500", icon: "🤝" },
  { value: "resources", label: "Resources", color: "bg-green-500", icon: "📚" },
  { value: "research", label: "Research", color: "bg-orange-500", icon: "🔬" },
  { value: "forum", label: "Forum", color: "bg-pink-500", icon: "💬" },
]

export function CreatePostModal({ onPostCreated }: CreatePostModalProps) {
  const [open, setOpen] = useState(false)
  const [title, setTitle] = useState("")
  const [content, setContent] = useState("")
  const [category, setCategory] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState("")

  const maxTitleLength = 100
  const maxContentLength = 2000

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!title.trim() || !content.trim() || !category) {
      setError("Please fill in all required fields")
      return
    }

    try {
      setIsSubmitting(true)
      await postsApi.createPost({
        title,
        content,
        category,
      })

      setTitle("")
      setContent("")
      setCategory("")
      setOpen(false)
      onPostCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create post")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedCategory = categories.find((c) => c.value === category)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2 bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90 transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105">
          <Sparkles className="w-4 h-4" />
          Create Post
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl animate-scale-in border-2">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
            Share Your Idea ✨
          </DialogTitle>
          <p className="text-sm text-muted-foreground mt-1">What's on your mind? Share it with the community!</p>
        </DialogHeader>

        {error && (
          <div className="p-3 bg-destructive/10 border-2 border-destructive/20 rounded-lg animate-bounce-in">
            <p className="text-sm text-destructive font-medium">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-3">
            <Label className="text-sm font-semibold flex items-center gap-2">
              <Hash className="w-4 h-4" />
              Choose a Category *
            </Label>
            <div className="flex flex-wrap gap-2">
              {categories.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  disabled={isSubmitting}
                  className={cn(
                    "px-4 py-2 rounded-full text-sm font-medium transition-all duration-200",
                    "border-2 flex items-center gap-2",
                    category === cat.value
                      ? `${cat.color} text-white border-transparent shadow-lg scale-105`
                      : "bg-secondary hover:bg-secondary/80 border-border hover:scale-105",
                  )}
                >
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {category === cat.value && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="title" className="text-sm font-semibold">
                Title *
              </Label>
              <span className="text-xs text-muted-foreground">
                {title.length}/{maxTitleLength}
              </span>
            </div>
            <Input
              id="title"
              placeholder="Give your post a catchy title..."
              value={title}
              onChange={(e) => setTitle(e.target.value.slice(0, maxTitleLength))}
              disabled={isSubmitting}
              className="border-2 focus:border-primary transition-colors"
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="content" className="text-sm font-semibold">
                Content *
              </Label>
              <span className="text-xs text-muted-foreground">
                {content.length}/{maxContentLength}
              </span>
            </div>
            <Textarea
              id="content"
              placeholder="Share your thoughts, ideas, or questions with the community..."
              value={content}
              onChange={(e) => setContent(e.target.value.slice(0, maxContentLength))}
              disabled={isSubmitting}
              rows={8}
              className="border-2 focus:border-primary transition-colors resize-none"
            />
          </div>

          <div className="flex gap-3 justify-end pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isSubmitting}
              className="border-2 hover:bg-secondary transition-all duration-200"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim() || !content.trim() || !category}
              className={cn(
                "gap-2 transition-all duration-300 shadow-md hover:shadow-lg",
                selectedCategory && `${selectedCategory.color} hover:opacity-90`,
              )}
            >
              {isSubmitting ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Post It!
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
