import { ProtectedRoute } from "@/components/protected-route"
import { LeaderboardContent } from "@/components/leaderboard-content"

export default function LeaderboardPage() {
  return (
    <ProtectedRoute>
      <LeaderboardContent />
    </ProtectedRoute>
  )
}
