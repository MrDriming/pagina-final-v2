"use server"

import { guardarNota } from "@/lib/notas"

export async function guardarNotaAction(input: {
  alumnoId: string
  materiaId: string
  t1: unknown
  t2: unknown
  t3: unknown
}) {
  return guardarNota(input)
}
