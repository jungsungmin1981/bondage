import Link from "next/link";
import { Geist, Geist_Mono } from "next/font/google";

import "@workspace/ui/globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { cn } from "@workspace/ui/lib/utils";
import { UserMenu } from "./user-menu";
import { MainNav } from "@/components/main-nav";

const fontSans = Geist({
  subsets: ["latin"],
  variable: "--font-sans",
});

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={cn("antialiased", fontMono.variable, "font-sans", fontSans.variable)}
    >
      <body
        suppressHydrationWarning
        style={{ WebkitTextSizeAdjust: "100%" }}
      >
        <ThemeProvider>
          <div className="flex min-h-svh flex-col">
            <header className="flex items-center justify-between gap-4 border-b px-4 py-3 sm:px-6">
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <Link href="/" className="shrink-0 text-sm font-medium">
                  Bondage
                </Link>
                <MainNav />
              </div>
              <UserMenu />
            </header>
            <main className="flex-1">{children}</main>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}

