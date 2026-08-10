"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { createClient } from "@/lib/supabase/client"

export function LogoutButton({ className }: { className?: string }) {
  const router = useRouter()

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      onClick={logout}
      className={
        className ??
        "rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
      }
      aria-label="Cerrar sesión"
      title="Cerrar sesión"
    >
      <LogOut className="size-5" />
    </button>
  )
}
