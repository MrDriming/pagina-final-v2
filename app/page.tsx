import { getSessionUser } from "@/lib/session"
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
  return <MainDashboardClient inicialUser={user} />
}