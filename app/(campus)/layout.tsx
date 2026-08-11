import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { DEV_AUTH_BYPASS } from "@/lib/dev-auth"
import { misNotificaciones } from "@/lib/notificaciones"
import { CampusShell } from "@/components/dashboard/campus-shell"

export default async function CampusLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getSessionUser()
  if (!user) redirect("/login")

  // Se leen acá, en el layout, para que la campana esté al día en cualquier
  // página sin pedir nada desde el cliente. Un `router.refresh()` después de
  // una acción vuelve a pasar por acá y las actualiza.
  const notificaciones = await misNotificaciones()

  return (
    <>
      {DEV_AUTH_BYPASS && (
        <div className="sticky top-0 z-50 bg-amber-500 px-4 py-1.5 text-center text-xs font-semibold text-amber-950">
          ⚠️ Login desactivado (DEV_BYPASS_AUTH). Usuario falso, rol {user.role}.
        </div>
      )}
      <CampusShell
        user={user}
        devBypass={DEV_AUTH_BYPASS}
        notificaciones={notificaciones}
      >
        {children}
      </CampusShell>
    </>
  )
}
