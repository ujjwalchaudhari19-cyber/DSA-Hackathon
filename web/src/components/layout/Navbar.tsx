import React, { useState } from "react"
import { Link, useNavigate } from "react-router-dom"
import { useTranslation } from "react-i18next"
import { useAuthStore } from "@/store/useAuthStore"
import { useAppStore } from "@/store/useAppStore"
import { LanguageSwitcher } from "./LanguageSwitcher"
import { ThemeToggle } from "./ThemeToggle"
import {
  Sprout,
  BarChart3,
  FileText,
  Users,
  History,
  Settings,
  LogIn,
  LogOut,
  User,
  Sparkles,
  ChevronDown,
} from "lucide-react"

export const Navbar: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { status, user, signOut } = useAuthStore()
  const { reset: resetAppStore } = useAppStore()
  const [dropdownOpen, setDropdownOpen] = useState(false)

  const handleSignOut = async () => {
    setDropdownOpen(false)
    resetAppStore()
    await signOut()
    navigate("/")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border bg-card/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 min-w-0 max-w-6xl items-center justify-between px-4">
        {/* Brand */}
        <Link to="/" className="flex min-w-0 shrink-0 items-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-white shadow-sm">
            <Sprout className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-base font-bold leading-tight tracking-tight text-foreground sm:hidden">
              GramUdyam
            </span>
            <span className="hidden text-lg font-bold leading-tight tracking-tight text-foreground sm:block">
              {t("app_name", "GramUdyam")}
            </span>
            <span className="hidden text-xs leading-none text-muted-foreground sm:block">
              GramUdyam AI
            </span>
          </div>
        </Link>

        {/* Navigation links & Utilities */}
        <div className="flex shrink-0 items-center gap-1.5 sm:gap-4">
          <nav className="hidden lg:flex items-center gap-3 text-sm font-medium text-foreground">
            <Link
              to="/dashboard"
              className="flex items-center gap-1.5 hover:text-primary transition-colors py-1 px-2 rounded-md hover:bg-secondary/60"
            >
              <BarChart3 className="w-4 h-4" />
              <span>{t("dashboard.title", "Dashboard")}</span>
            </Link>
            <Link
              to="/documents"
              className="flex items-center gap-1.5 hover:text-primary transition-colors py-1 px-2 rounded-md hover:bg-secondary/60"
            >
              <FileText className="w-4 h-4" />
              <span>{t("documents.title", "Documents")}</span>
            </Link>
            <Link
              to="/suppliers"
              className="flex items-center gap-1.5 hover:text-primary transition-colors py-1 px-2 rounded-md hover:bg-secondary/60"
            >
              <Users className="w-4 h-4" />
              <span>{t("suppliers.title", "Suppliers")}</span>
            </Link>
            {status === "user" && (
              <Link
                to="/history"
                className="flex items-center gap-1.5 hover:text-primary transition-colors py-1 px-2 rounded-md hover:bg-secondary/60"
              >
                <History className="w-4 h-4" />
                <span>{t("history.nav", "My Plans")}</span>
              </Link>
            )}
          </nav>

          <LanguageSwitcher />
          <ThemeToggle />

          {/* User / Guest Avatar Menu */}
          {status === "user" ? (
            <div className="relative">
              <button
                type="button"
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="min-h-[40px] px-2.5 py-1.5 rounded-lg border border-border bg-secondary/50 hover:bg-secondary text-foreground flex items-center gap-2 cursor-pointer transition-colors text-xs font-semibold"
                aria-label="User profile menu"
              >
                <div className="w-6 h-6 rounded-full bg-primary text-white flex items-center justify-center font-bold text-xs">
                  {user?.name?.[0]?.toUpperCase() || "U"}
                </div>
                <span className="hidden sm:inline max-w-[100px] truncate">{user?.name || "Account"}</span>
                <ChevronDown className="w-3.5 h-3.5 text-muted-foreground" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-48 rounded-lg border border-border bg-card shadow-lg py-1.5 text-xs z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-1.5 border-b border-border text-muted-foreground truncate">
                    <span className="font-semibold block text-foreground truncate">{user?.name}</span>
                    <span className="text-[11px] truncate">{user?.email}</span>
                  </div>
                  <Link
                    to="/history"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <History className="w-3.5 h-3.5 text-primary" />
                    <span>My Saved Plans</span>
                  </Link>
                  <Link
                    to="/settings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-foreground hover:bg-secondary/60 transition-colors"
                  >
                    <Settings className="w-3.5 h-3.5 text-primary" />
                    <span>Settings</span>
                  </Link>
                  <div className="border-t border-border mt-1 pt-1">
                    <button
                      onClick={handleSignOut}
                      className="w-full text-left flex items-center gap-2 px-3 py-2 text-destructive hover:bg-destructive/10 transition-colors cursor-pointer"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : status === "guest" ? (
            <div className="flex items-center gap-2">
              <span className="hidden sm:flex items-center gap-1 text-[11px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-full">
                <Sparkles className="w-3 h-3 text-amber-600 dark:text-amber-400" />
                <span>Guest</span>
              </span>
              <Link
                to="/login"
                aria-label="Log in"
                className="min-h-[40px] px-3 py-1.5 rounded-md bg-primary hover:bg-primary-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Log In</span>
              </Link>
            </div>
          ) : (
            <Link
              to="/login"
              aria-label="Log in"
              className="min-h-[40px] px-3 py-1.5 rounded-md bg-primary hover:bg-primary-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Log In</span>
            </Link>
          )}
        </div>
      </div>
    </header>
  )
}
