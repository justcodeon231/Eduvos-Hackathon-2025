import { ProtectedRoute } from "@/components/protected-route"
import { MessagesContent } from "@/components/messages-content"

export default function MessagesPage() {
  return (
    <ProtectedRoute>
      <MessagesContent />
    </ProtectedRoute>
  )
}
