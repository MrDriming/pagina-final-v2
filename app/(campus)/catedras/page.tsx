import { requireRole } from "@/lib/session"
import { getMisCatedras } from "@/lib/catedras"
import { CatedrasView } from "@/components/dashboard/catedras-view"

export default async function Page() {
  await requireRole("profesor")
  const catedras = await getMisCatedras()
  return <CatedrasView catedras={catedras} />
}
