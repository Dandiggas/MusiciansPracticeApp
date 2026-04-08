import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { ThemeProvider } from "@/providers/theme-provider";
import { Header } from "@/components/navigation/Header";

export const metadata: Metadata = {
  title: "The Shed",
  description: "Your practice studio. Pick up where you left off.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning className="dark">
      <body className={`${GeistSans.variable} ${GeistMono.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Header />
          <main className="min-h-[100dvh]">
            {children}
          </main>
          {/* Grain texture overlay — fixed, pointer-events-none, GPU-safe */}
          <div
            aria-hidden="true"
            className="pointer-events-none fixed inset-0 z-50 opacity-[0.025]"
            style={{
              backgroundImage: 'url("/noise.svg")',
              backgroundRepeat: 'repeat',
              backgroundSize: '256px 256px',
            }}
          />
        </ThemeProvider>
      </body>
    </html>
  );
}
