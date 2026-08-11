"use server"

import { revalidatePath } from "next/cache"
import { marcarLeida, marcarTodasLeidas } from "@/lib/notificaciones"

/**
 * Ninguna de las dos recibe el destinatario: `lib/notificaciones.ts` acota el
 * UPDATE al usuario de la sesión. Lo único que llega del cliente es el id de
 * la notificación, y ese id solo sirve si además es suya.
 */

export async function marcarLeidaAction(id: string) {
  const r = await marcarLeida(id)
  // `layout` es quien lee las notificaciones, así que hay que revalidar la
  // ruta en la que está parado el usuario para que la campana se actualice.
  if (r.ok) revalidatePath("/", "layout")
  return r
}

export async function marcarTodasLeidasAction() {
  const r = await marcarTodasLeidas()
  if (r.ok) revalidatePath("/", "layout")
  return r
}
