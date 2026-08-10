import { requireRole } from "@/lib/session"
import { listarUsuarios, listarMaterias, listarCatedras } from "@/lib/catedras"
import { UsuariosView } from "@/components/dashboard/usuarios-view"

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ u?: string }>
}) {
  const admin = await requireRole("admin")
  const { u } = await searchParams

  const [usuarios, materias] = await Promise.all([
    listarUsuarios(),
    listarMaterias(),
  ])

  const seleccionado = usuarios.find((x) => x.userId === u) ?? null
  const catedras =
    seleccionado?.rol === "profesor" ? await listarCatedras(seleccionado.userId) : []

  return (
    <UsuariosView
      usuarios={usuarios}
      materias={materias}
      seleccionado={seleccionado}
      catedras={catedras}
      usuarioActualId={admin.id}
    />
  )
}
