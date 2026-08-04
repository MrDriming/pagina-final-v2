import { redirect } from "next/navigation"
import { getSessionUser } from "@/lib/session"
import { AuthScreen } from "@/components/auth/auth-screen"

export default async function Page() {
  const user = await getSessionUser()
  if (user) redirect("/")
  return <AuthScreen />
}
