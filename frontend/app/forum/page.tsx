import { ProtectedRoute } from "@/components/protected-route"
import { ForumContent } from "@/components/forum-content"

export default function ForumPage() {
  return (
    <ProtectedRoute>
      <ForumContent />
    </ProtectedRoute>
  )
}
