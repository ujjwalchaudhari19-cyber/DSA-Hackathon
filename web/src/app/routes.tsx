import React, { lazy, Suspense } from "react"
import { Routes, Route, Navigate } from "react-router-dom"
import { Layout } from "@/components/layout/Layout"
import { LandingPage } from "@/pages/LandingPage"
import { DiscoverPage } from "@/pages/DiscoverPage"
import { DiscoverResultsPage } from "@/pages/DiscoverResultsPage"
import { IdeaInputPage } from "@/pages/IdeaInputPage"
import { ProfilePage } from "@/pages/ProfilePage"
import { LocalAnalysisPage } from "@/pages/LocalAnalysisPage"
import { FinancePage } from "@/pages/FinancePage"
import { CreditReadinessPage } from "@/pages/CreditReadinessPage"
import { ReportPage } from "@/pages/ReportPage"
import { DashboardPage } from "@/pages/DashboardPage"
import { ComparePage } from "@/pages/ComparePage"
import { DocumentsPage } from "@/pages/DocumentsPage"
import { SuppliersPage } from "@/pages/SuppliersPage"
import { LoginPage } from "@/pages/LoginPage"
import { SignupPage } from "@/pages/SignupPage"
import { RequireAuth } from "@/components/auth/RequireAuth"

// Lazy-load history and settings to preserve mobile performance
const HistoryPage = lazy(() => import("@/pages/HistoryPage").then((m) => ({ default: m.HistoryPage })))
const SettingsPage = lazy(() => import("@/pages/SettingsPage").then((m) => ({ default: m.SettingsPage })))

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[40vh]">
    <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
  </div>
)

export const AppRoutes: React.FC = () => {
  return (
    <>
      <Routes>
        <Route element={<Layout />}>
          {/* Authentication is the only public surface. */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
        </Route>

        {/* Every application route requires a registered Firebase account. */}
        <Route element={<RequireAuth><Layout /></RequireAuth>}>
          <Route path="/" element={<LandingPage />} />
          <Route path="/discover" element={<DiscoverPage />} />
          <Route path="/discover/results" element={<DiscoverResultsPage />} />
          <Route path="/idea" element={<IdeaInputPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/analysis" element={<LocalAnalysisPage />} />
          <Route path="/finance" element={<FinancePage />} />
          <Route path="/credit" element={<CreditReadinessPage />} />
          <Route path="/report" element={<ReportPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/compare" element={<ComparePage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/suppliers" element={<SuppliersPage />} />

          <Route
            path="/history"
            element={
              <Suspense fallback={<PageLoader />}>
                <HistoryPage />
              </Suspense>
            }
          />
          <Route
            path="/settings"
            element={
              <Suspense fallback={<PageLoader />}>
                <SettingsPage />
              </Suspense>
            }
          />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </>
  )
}
