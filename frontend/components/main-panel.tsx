"use client"

import { useState } from "react"
import { MessageSquare, FileText } from "lucide-react"
import { DMView } from "./dm-view"
import { PostsView } from "./posts-view"

interface MainPanelProps {
  selectedUserId: number | null
  selectedUserName: string | null
  onRefreshNotifications: () => void
}

export function MainPanel({ selectedUserId, selectedUserName, onRefreshNotifications }: MainPanelProps) {
  const [activeView, setActiveView] = useState<"dms" | "posts">("posts")

  return (
    <main className="flex-1 flex flex-col bg-white h-full">
      {/* Toggle Tabs */}
      <div className="border-b border-gray-200 bg-white">
        <div className="flex">
          <button
            onClick={() => setActiveView("dms")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeView === "dms"
                ? "text-[#005EB8] border-b-2 border-[#005EB8] bg-[#F4F8FB]"
                : "text-gray-600 hover:text-[#005EB8] hover:bg-gray-50"
            }`}
          >
            <MessageSquare className="h-5 w-5" />
            Direct Messages
          </button>
          <button
            onClick={() => setActiveView("posts")}
            className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 font-medium transition-colors ${
              activeView === "posts"
                ? "text-[#005EB8] border-b-2 border-[#005EB8] bg-[#F4F8FB]"
                : "text-gray-600 hover:text-[#005EB8] hover:bg-gray-50"
            }`}
          >
            <FileText className="h-5 w-5" />
            Posts
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-hidden">
        {activeView === "dms" ? (
          <DMView
            selectedUserId={selectedUserId}
            selectedUserName={selectedUserName}
            onRefreshNotifications={onRefreshNotifications}
          />
        ) : (
          <PostsView onRefreshNotifications={onRefreshNotifications} />
        )}
      </div>
    </main>
  )
}
