import { ProtectedRoute } from "@/components/protected-route"
import { DashboardContent } from "@/components/dashboard-content"

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <DashboardContent />
    </ProtectedRoute>
  )
}
