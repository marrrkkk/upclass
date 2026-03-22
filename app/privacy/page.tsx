import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "UpClass privacy policy.",
}

export default function PrivacyPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Privacy Policy</h1>
        <p className="text-muted-foreground">
          UpClass stores account, classroom, messaging, and resource data so the product can
          operate as a collaborative learning workspace.
        </p>
      </div>

      <section className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          We collect the information required to authenticate users, power classes, persist
          content, and keep collaboration features working across devices.
        </p>
        <p>
          Your data is only shown to authorized users based on membership, access controls, and
          product settings. We do not sell your personal information.
        </p>
        <p>
          If you need help with account data or privacy requests, use the contact page listed in
          the app.
        </p>
      </section>
    </main>
  )
}
