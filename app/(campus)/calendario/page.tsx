import { requireUser } from "@/lib/session"
import { CalendarioView } from "@/components/dashboard/calendario-view"

export default async function Page() {
  const user = await requireUser()
  return <CalendarioView rol={user.role} />
}
