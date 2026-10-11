import React from "react"
import { useAppStore } from "@/store/useAppStore"
import { Sun, Moon } from "lucide-react"

export const ThemeToggle: React.FC = () => {
  const { theme, toggleTheme } = useAppStore()

  return (
    <button
      onClick={toggleTheme}
      type="button"
      title={theme === "dark" ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="p-2 rounded-md border border-border bg-card hover:bg-muted text-foreground transition-colors cursor-pointer flex items-center justify-center min-w-[38px] min-h-[38px]"
      aria-label="Toggle theme"
    >
      {theme === "dark" ? (
        <Sun className="w-4 h-4 text-amber-500" />
      ) : (
        <Moon className="w-4 h-4 text-earth-700" />
      )}
    </button>
  )
}

