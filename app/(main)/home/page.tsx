import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import SignOutButton from "@/components/auth/signout-button"

export default async function HomePage() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
    return (
        <div>
            <h1>Home</h1>
            {session ? session.user.name : "Not Signed In"}
            {session ? <SignOutButton /> : "Not Signed In"}
        </div>
    )
}