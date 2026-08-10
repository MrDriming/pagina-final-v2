import { type EmailOtpType } from "@supabase/supabase-js"
import { redirect } from "next/navigation"
import { type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { safeRedirectPath } from "@/lib/safe-redirect"

/**
 * Flujo con `token_hash`. Solo aplica si personalizaste las plantillas de
 * mail en Supabase para apuntar acá; si usás las de fábrica, el link cae
 * en `/auth/callback`.
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const token_hash = searchParams.get("token_hash")
  const type = searchParams.get("type") as EmailOtpType | null
  const next = safeRedirectPath(searchParams.get("next"))

  if (token_hash && type) {
    const supabase = await createClient()

    const { error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      redirect(next)
    }
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`)
  }

  redirect(
    `/auth/error?error=${encodeURIComponent("Falta el token de confirmación")}`,
  )
}
