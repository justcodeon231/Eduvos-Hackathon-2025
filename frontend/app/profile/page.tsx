import { ProtectedRoute } from "@/components/protected-route"
import { ProfileContent } from "@/components/profile-content"

export default function ProfilePage() {
  return (
    <ProtectedRoute>
      <ProfileContent />
    </ProtectedRoute>
  )
}
