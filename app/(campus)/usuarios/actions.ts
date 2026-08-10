"use server"

import { revalidatePath } from "next/cache"
import {
  asignarCatedra,
  quitarCatedra,
  cambiarRol,
  asignarCurso,
} from "@/lib/catedras"

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

export async function cambiarRolAction(input: { userId: string; rol: string }) {
  const r = await cambiarRol(input)
  if (r.ok) revalidatePath("/usuarios")
  return r
}

export async function asignarCursoAction(input: {
  userId: string
  anio: string | null
  division: string | null
}) {
  const r = await asignarCurso(input)
  if (r.ok) revalidatePath("/usuarios")
  return r
}
