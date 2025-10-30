import { ProtectedRoute } from "@/components/protected-route"
import { PublicProfileContent } from "@/components/public-profile-content"

export default function PublicProfilePage({ params }: { params: { id: string } }) {
  return (
    <ProtectedRoute>
      <PublicProfileContent userId={Number.parseInt(params.id)} />
    </ProtectedRoute>
  )
}
