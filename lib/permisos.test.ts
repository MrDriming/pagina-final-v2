import { describe, it, expect } from "vitest"
import {
  puedeVerNota,
  puedeEditarNota,
  type CatedraScope,
  type AlumnoUbicado,
} from "@/lib/permisos"

const SISTEMAS = "11111111-1111-1111-1111-111111111111"
const TALLER = "22222222-2222-2222-2222-222222222222"

const profesor = { id: "prof-1", role: "profesor" as const }
const admin = { id: "adm-1", role: "admin" as const }

const facundo: AlumnoUbicado = { id: "al-1", anio: "4to", division: "A" }
const lautaro: AlumnoUbicado = { id: "al-2", anio: "4to", division: "B" }

// El profesor dicta Sistemas Digitales solo en 4to A.
const catedrasDe4toA: CatedraScope[] = [
  { materiaId: SISTEMAS, anio: "4to", division: "A" },
]

describe("puedeVerNota", () => {
  it("el profesor ve al alumno de la división que dicta", () => {
    expect(puedeVerNota(profesor, facundo, SISTEMAS, catedrasDe4toA)).toBe(true)
  })

  it("el profesor NO ve al alumno de otra división en la misma materia", () => {
    expect(puedeVerNota(profesor, lautaro, SISTEMAS, catedrasDe4toA)).toBe(false)
  })

  it("el profesor NO ve otra materia del mismo alumno", () => {
    expect(puedeVerNota(profesor, facundo, TALLER, catedrasDe4toA)).toBe(false)
  })

  it("el profesor con dos cátedras del mismo alumno ve esas dos y ninguna más", () => {
    const dos: CatedraScope[] = [
      { materiaId: SISTEMAS, anio: "4to", division: "A" },
      { materiaId: TALLER, anio: "4to", division: "A" },
    ]
    const otra = "33333333-3333-3333-3333-333333333333"
    expect(puedeVerNota(profesor, facundo, SISTEMAS, dos)).toBe(true)
    expect(puedeVerNota(profesor, facundo, TALLER, dos)).toBe(true)
    expect(puedeVerNota(profesor, facundo, otra, dos)).toBe(false)
  })

  it("el profesor sin cátedras no ve nada", () => {
    expect(puedeVerNota(profesor, facundo, SISTEMAS, [])).toBe(false)
  })

  it("el alumno se ve a sí mismo", () => {
    const actor = { id: facundo.id, role: "alumno" as const }
    expect(puedeVerNota(actor, facundo, SISTEMAS, [])).toBe(true)
  })

  it("el alumno NO ve a un compañero aunque pida su id", () => {
    const actor = { id: facundo.id, role: "alumno" as const }
    expect(puedeVerNota(actor, lautaro, SISTEMAS, [])).toBe(false)
  })

  it("el admin ve todo", () => {
    expect(puedeVerNota(admin, lautaro, TALLER, [])).toBe(true)
  })

  it("no ve nada si el alumno no tiene curso asignado", () => {
    const sinCurso: AlumnoUbicado = { id: "al-3", anio: null, division: null }
    expect(puedeVerNota(profesor, sinCurso, SISTEMAS, catedrasDe4toA)).toBe(false)
  })
})

describe("puedeEditarNota", () => {
  it("el profesor edita en su cátedra", () => {
    expect(puedeEditarNota(profesor, facundo, SISTEMAS, catedrasDe4toA)).toBe(true)
  })

  it("el profesor NO edita en una cátedra ajena", () => {
    expect(puedeEditarNota(profesor, lautaro, SISTEMAS, catedrasDe4toA)).toBe(false)
    expect(puedeEditarNota(profesor, facundo, TALLER, catedrasDe4toA)).toBe(false)
  })

  it("el admin lee pero NO escribe", () => {
    expect(puedeVerNota(admin, facundo, SISTEMAS, [])).toBe(true)
    expect(puedeEditarNota(admin, facundo, SISTEMAS, [])).toBe(false)
  })

  it("el alumno NO edita su propia nota", () => {
    const actor = { id: facundo.id, role: "alumno" as const }
    expect(puedeEditarNota(actor, facundo, SISTEMAS, [])).toBe(false)
  })
})
