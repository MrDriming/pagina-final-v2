import { requireUser } from "@/lib/session"
import { ConsultasView } from "@/components/dashboard/consultas-view"

export default async function Page() {
  const user = await requireUser()
  return <ConsultasView rol={user.role} />
}
