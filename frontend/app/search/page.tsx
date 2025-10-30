import { ProtectedRoute } from "@/components/protected-route"
import { SearchContent } from "@/components/search-content"

export default function SearchPage() {
  return (
    <ProtectedRoute>
      <SearchContent />
    </ProtectedRoute>
  )
}
