import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "UpClass terms of service.",
}

export default function TermsPage() {
  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-16 sm:px-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Terms of Service</h1>
        <p className="text-muted-foreground">
          These terms govern your use of UpClass and its class, messaging, whiteboard, and
          resource-sharing features.
        </p>
      </div>

      <section className="space-y-3 text-sm leading-6 text-muted-foreground">
        <p>
          You are responsible for the content you create, upload, and share in UpClass. Do not
          upload unlawful, abusive, or unauthorized materials.
        </p>
        <p>
          UpClass may suspend accounts that misuse the service, disrupt classrooms, or attempt to
          access data without permission.
        </p>
        <p>
          The service is provided as available. We may update or remove features to improve
          reliability, security, and compliance.
        </p>
      </section>
    </main>
  )
}
