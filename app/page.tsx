import { getSessionUser } from "@/lib/session"
import { DEV_AUTH_BYPASS } from "@/lib/dev-auth"
import { AuthScreen } from "@/components/auth/auth-screen"
import { MainDashboardClient } from "@/app/dashboard-client"


// 1️⃣ COMPONENTE DE SERVIDOR: Controla el acceso de forma segura
export default async function Page() {
  const user = await getSessionUser()

  // Si no está logueado, le clava la pantalla de login/registro
  if (!user) {
    return <AuthScreen />
  }

  // Si sí está logueado, le pasa el usuario al cliente interactivo
  return (
    <>
      {DEV_AUTH_BYPASS && (
        <div className="sticky top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          ⚠️ Login desactivado (DEV_BYPASS_AUTH). Usuario falso, rol{" "}
          {user.role}. Apagalo en .env.local antes de probar el auth real.
        </div>
      )}
      <MainDashboardClient inicialUser={user} />
    </>
  )
}
