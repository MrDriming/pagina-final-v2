"use server"

import { revalidatePath } from "next/cache"
import { asignarCatedra, quitarCatedra } from "@/lib/catedras"

export async function asignarCatedraAction(input: {
  profesorId: string
  materiaId: string
  division: string
}) {
  const r = await asignarCatedra(input)
  if (r.ok) revalidatePath("/usuarios")
  return r
}

export async function quitarCatedraAction(catedraId: string) {
  const r = await quitarCatedra(catedraId)
  if (r.ok) revalidatePath("/usuarios")
  return r
}
