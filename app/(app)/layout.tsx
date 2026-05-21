import { RootClientShell } from "@/components/root-client-shell"

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <RootClientShell>{children}</RootClientShell>
}
