import { pgTable, text, integer, uuid, timestamp } from "drizzle-orm/pg-core"

// Tabla de Perfiles para agregar las materias/años de los profesores
export const perfiles = pgTable("perfiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull(),
  rol: text("rol").$type<"alumno" | "profesor" | "admin">().notNull(),
  // 1️⃣ CORRECCIÓN: En Drizzle, la función array() se pasa como argumento dentro de text(), no encadenada al final.
  catedras: text("catedras").array(), 
})

// Tabla de Calificaciones configurada por TRIMESTRES
export const calificaciones = pgTable("calificaciones", {
  id: uuid("id").primaryKey().defaultRandom(),
  alumnoId: text("alumno_id").notNull(),
  materia: text("materia").notNull(),
  trimestre1: integer("trimestre_1"),
  trimestre2: integer("trimestre_2"),
  trimestre3: integer("trimestre_3"),
  updatedAt: timestamp("updated_at").defaultNow(),
})

// Tabla para Consultas Docentes
export const consultas = pgTable("consultas", {
  id: uuid("id").primaryKey().defaultRandom(),
  alumnoId: text("alumno_id").notNull(),
  profesorId: text("profesor_id").notNull(),
  materia: text("materia").notNull(),
  mensaje: text("mensaje").notNull(),
  respuesta: text("respuesta"),
  // 2️⃣ CORRECCIÓN: El valor por defecto de un string (text) debe ir entre comillas dentro de .default('pendiente')
  estado: text("estado").default("pendiente"), 
  createdAt: timestamp("created_at").defaultNow(),
})