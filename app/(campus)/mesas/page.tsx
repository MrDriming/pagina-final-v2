import { requireUser } from "@/lib/session"
import { MesasView } from "@/components/dashboard/mesas-view"

export default async function Page() {
  await requireUser()
  return <MesasView />
}
