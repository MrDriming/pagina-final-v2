"use client"

import { useState } from "react"
import Link from "next/link"
import { Mail, ArrowRight, Loader2 } from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import {
  AuthCard,
  inputClass,
  submitClass,
  labelClass,
} from "@/components/auth/auth-card"

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [enviado, setEnviado] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const supabase = createClient()
    setIsLoading(true)
    setError(null)

    try {
      // Esta URL tiene que estar en Authentication > URL Configuration
      // > Redirect URLs del proyecto de Supabase.
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?next=/auth/update-password`,
        },
      )
      if (resetError) throw resetError
      setEnviado(true)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Ocurrió un error")
    } finally {
      setIsLoading(false)
    }
  }

  if (enviado) {
    return (
      <AuthCard
        titulo="Revisá tu correo"
        descripcion="Te mandamos las instrucciones"
      >
        <p className="text-sm text-muted-foreground text-center">
          Si esa dirección tiene una cuenta registrada, vas a recibir un mail
          con el link para restablecer la contraseña.
        </p>
        <div className="pt-4 border-t border-border/60 text-center">
          <Link
            href="/"
            className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
          >
            Volver al inicio
          </Link>
        </div>
      </AuthCard>
    )
  }

  return (
    <AuthCard
      titulo="Restablecer contraseña"
      descripcion="Ponés tu correo y te mandamos un link"
    >
      {error && (
        <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-xs font-medium text-destructive text-center">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label className={labelClass}>Correo Electrónico</label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/70" />
            <input
              type="email"
              required
              placeholder="usuario@ipesmi.edu.ar"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <button type="submit" disabled={isLoading} className={submitClass}>
          {isLoading ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <>
              Enviar link <ArrowRight className="size-4" />
            </>
          )}
        </button>
      </form>

      <div className="pt-4 border-t border-border/60 text-center">
        <Link
          href="/"
          className="text-xs font-medium text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
        >
          ¿Te acordaste? Iniciá sesión
        </Link>
      </div>
    </AuthCard>
  )
}
