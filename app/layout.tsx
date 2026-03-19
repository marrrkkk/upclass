import type { Metadata, Viewport } from "next";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { PWAProvider } from "@/components/pwa-provider";
import { OfflineIndicator } from "@/components/offline-indicator";
import { OfflineErrorBoundary } from "@/components/offline-error-boundary";
import { Analytics } from "@vercel/analytics/next";

export const metadata: Metadata = {
  title: {
    template: "%s | UpClass",
    default: "UpClass - The Future of Learning Management",
  },
  description: "Manage courses, engage students, and track progress with UpClass.",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/favicon.ico', sizes: 'any' },
    ],
    apple: [{ url: '/icon.svg', type: 'image/svg+xml' }],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "UpClass",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "hsl(var(--primary))" },
    { media: "(prefers-color-scheme: dark)", color: "hsl(var(--primary))" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased" suppressHydrationWarning>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
        >
          <PWAProvider>
            <OfflineErrorBoundary>
              <OfflineIndicator />
              {children}
            </OfflineErrorBoundary>
          </PWAProvider>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
