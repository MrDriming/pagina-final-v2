"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Lock, ArrowRight, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  AuthCard,
  inputClass,
  submitClass,
  labelClass,
} from "@/components/auth/auth-card"

export function UpdatePasswordForm() {
  const [password, setPassword] = useState("")
  const [repetir, setRepetir] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (password !== repetir) {
      setError("Las contraseñas no coinciden")
      return
    }

    const supabase = createClient()
    setIsLoading(true)

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })
      if (updateError) throw updateError
      router.push("/")
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <AuthCard
      titulo="Nueva contraseña"
      descripcion="Elegí la contraseña con la que vas a entrar de ahora en más"
    >
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className={labelClass}>Contraseña nueva</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div className="space-y-1">
          <label className={labelClass}>Repetir contraseña</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
            <input
              type="password"
              required
              minLength={6}
              placeholder="••••••••"
              value={repetir}
              onChange={(e) => setRepetir(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={submitClass}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Guardar <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>
    </AuthCard>
  )
}
