"use client"

import { useState } from "react"
import type { SessionUser } from "@/lib/session"
import { Sidebar } from "@/components/dashboard/sidebar"
import { Topbar } from "@/components/dashboard/topbar"

export function CampusShell({
  user,
  children,
}: {
  user: SessionUser
  children: React.ReactNode
}) {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar
        rol={user.role}
        open={menuOpen}
        onClose={() => setMenuOpen(false)}
      />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          rol={user.role}
          onOpenMenu={() => setMenuOpen(true)}
          nombre={user.name}
          detalle={user.email}
        />
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 md:px-6 md:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
