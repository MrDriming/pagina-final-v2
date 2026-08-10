import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"
import { hasEnvVars } from "../utils"
import { DEV_AUTH_BYPASS } from "../dev-auth"

// Rutas accesibles sin sesión. Agregá acá cualquier ruta pública nueva.
const RUTAS_PUBLICAS = ["/auth", "/login"]

function esRutaPublica(pathname: string) {
  // Coincidencia por segmento, no por prefijo: si no, una ruta futura como
  // `/authoring` o `/loginx` quedaría pública sin que nadie lo decida.
  return RUTAS_PUBLICAS.some(
    (ruta) => pathname === ruta || pathname.startsWith(`${ruta}/`),
  )
}

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  // Bypass de desarrollo: no se chequea sesión, pasa todo.
  if (DEV_AUTH_BYPASS) {
    return supabaseResponse
  }

  // Sin variables de entorno no hay forma de validar la sesión. Un deploy
  // mal configurado (env vars faltantes) no puede traducirse en "dejar
  // pasar todo": eso desactivaría la protección de todas las rutas
  // privadas en producción. Cerramos en vez de abrir: mismo trato que un
  // usuario no autenticado, redirect a /login salvo que la ruta ya sea
  // pública (si no, un usuario sin config quedaría en loop de redirects
  // porque /login también redirigiría).
  if (!hasEnvVars) {
    if (esRutaPublica(request.nextUrl.pathname)) {
      return supabaseResponse
    }
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Con Fluid compute, no guardar este cliente en una global.
  // Siempre uno nuevo por request.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          )
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          )
        },
      },
    },
  )

  // No meter código entre createServerClient y supabase.auth.getClaims().
  // Un error acá hace muy difícil debuggear usuarios deslogueados al azar.
  const { data } = await supabase.auth.getClaims()
  const user = data?.claims

  if (!user && !esRutaPublica(request.nextUrl.pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  // Hay que devolver el objeto supabaseResponse tal cual. Si creás una
  // NextResponse nueva, copiale las cookies o la sesión se desincroniza.
  return supabaseResponse
}
