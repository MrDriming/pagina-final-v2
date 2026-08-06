// Tipos y datos de ejemplo.
// La forma de estos objetos imita la estructura de tablas de Supabase
// para facilitar el reemplazo de los mocks por fetching real.

export type Rol = "alumno" | "profesor" | "admin"

export type TipoEvento = "parcial" | "tp" | "final" | "entrega"

export interface EventoCalendario {
  id: string
  titulo: string
  materia: string
  tipo: TipoEvento
  fecha: string // ISO date
  hora: string
  aula: string
  docente: string
}

export type CategoriaMesa = "previas" | "recuperatorios" | "equivalencias"

export interface MesaExamen {
  id: string
  materia: string
  categoria: CategoriaMesa
  fecha: string // ISO date
  hora: string
  condicion: string
  tribunal: string[]
  aula: string
}

export const PERFIL = {
  alumno: { nombre: "Lucía Fernández", detalle: "3.º Año · Técnico en Programación", legajo: "TP-2024-0187" },
  profesor: { nombre: "Prof. Martín Aguirre", detalle: "Cátedra de Bases de Datos", legajo: "DOC-0421" },
  admin: { nombre: "Carla Domínguez", detalle: "Secretaría Académica", legajo: "ADM-0033" },
}

export const EVENTOS: EventoCalendario[] = [
  { id: "e1", titulo: "Parcial 2", materia: "Bases de Datos", tipo: "parcial", fecha: "2026-07-03", hora: "08:00", aula: "Lab 2", docente: "Prof. Aguirre" },
  { id: "e2", titulo: "Entrega TP Final", materia: "Programación III", tipo: "tp", fecha: "2026-07-07", hora: "23:59", aula: "Campus", docente: "Prof. Vega" },
  { id: "e3", titulo: "Parcial 1", materia: "Redes y Comunicaciones", tipo: "parcial", fecha: "2026-07-10", hora: "10:30", aula: "Aula 14", docente: "Prof. Ledesma" },
  { id: "e4", titulo: "Examen Final", materia: "Inglés Técnico", tipo: "final", fecha: "2026-07-15", hora: "09:00", aula: "Aula 7", docente: "Prof. Ortiz" },
  { id: "e5", titulo: "Entrega Informe", materia: "Sistemas Operativos", tipo: "entrega", fecha: "2026-07-21", hora: "18:00", aula: "Campus", docente: "Prof. Díaz" },
  { id: "e6", titulo: "Parcial Recuperatorio", materia: "Matemática Aplicada", tipo: "parcial", fecha: "2026-07-24", hora: "08:30", aula: "Aula 3", docente: "Prof. Romano" },
]

export const MESAS: MesaExamen[] = [
  // Previas
  { id: "p1", materia: "Física II (2.º Año)", categoria: "previas", fecha: "2026-08-05", hora: "09:00", condicion: "Regular", aula: "Aula 9", tribunal: ["Prof. Gómez", "Prof. Salas", "Prof. Núñez"] },
  { id: "p2", materia: "Álgebra (1.º Año)", categoria: "previas", fecha: "2026-08-06", hora: "11:00", condicion: "Libre", aula: "Aula 4", tribunal: ["Prof. Romano", "Prof. Acosta"] },
  { id: "p3", materia: "Química (2.º Año)", categoria: "previas", fecha: "2026-08-07", hora: "08:30", condicion: "Regular", aula: "Lab 1", tribunal: ["Prof. Pérez", "Prof. Ibáñez", "Prof. Soto"] },
  // Recuperatorios
  { id: "r1", materia: "Redes y Comunicaciones", categoria: "recuperatorios", fecha: "2026-07-28", hora: "10:00", condicion: "Recupera 2.º Cuatri", aula: "Lab 2", tribunal: ["Prof. Ledesma", "Prof. Aguirre"] },
  { id: "r2", materia: "Matemática Aplicada", categoria: "recuperatorios", fecha: "2026-07-29", hora: "08:00", condicion: "Recupera 1.º Cuatri", aula: "Aula 3", tribunal: ["Prof. Romano", "Prof. Vega"] },
  // Equivalencias
  { id: "q1", materia: "Programación I", categoria: "equivalencias", fecha: "2026-08-12", hora: "09:30", condicion: "Ingreso · Reválida", aula: "Lab 3", tribunal: ["Prof. Vega", "Prof. Méndez", "Prof. Cruz"] },
  { id: "q2", materia: "Inglés Técnico", categoria: "equivalencias", fecha: "2026-08-13", hora: "12:00", condicion: "Ingreso · Reválida", aula: "Aula 7", tribunal: ["Prof. Ortiz", "Prof. Lara"] },
]
