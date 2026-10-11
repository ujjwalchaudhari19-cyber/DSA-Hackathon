import React from 'react'
import { Link } from 'react-router-dom'
import { useAuthStore } from '@/store/useAuthStore'
import { Sparkles, X } from 'lucide-react'

export const GuestBanner: React.FC = () => {
  const { status, isBannerDismissed, dismissBanner } = useAuthStore()

  if (status !== 'guest' || isBannerDismissed) {
    return null
  }

  return (
    <div className="w-full bg-amber-500/15 border-b border-amber-500/30 text-amber-900 dark:text-amber-200">
      <div className="max-w-6xl mx-auto px-4 h-12 flex items-center justify-between text-xs sm:text-sm font-medium">
        <div className="flex items-center gap-2 truncate">
          <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
          <span className="truncate">You are in Guest Mode.</span>
          <Link
            to="/login"
            className="underline font-bold text-primary hover:text-primary-700 dark:text-primary-400 shrink-0 ml-1"
          >
            Sign in to save your plan
          </Link>
        </div>

        <button
          onClick={dismissBanner}
          className="min-w-[48px] min-h-[48px] flex items-center justify-center p-2 rounded-md hover:bg-amber-500/20 text-amber-800 dark:text-amber-300 transition-colors cursor-pointer"
          aria-label="Dismiss banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}

