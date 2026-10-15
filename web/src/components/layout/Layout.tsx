import React from "react"
import { Outlet } from "react-router-dom"
import { Navbar } from "./Navbar"
import { GuestBanner } from "@/components/auth/GuestBanner"
import { Stepper } from "./Stepper"
import { Footer } from "./Footer"

export const Layout: React.FC = () => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground">
      <Navbar />
      <GuestBanner />
      <Stepper />
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 py-6 md:py-8">
        <Outlet />
      </main>
      <Footer />
    </div>
  )
}

