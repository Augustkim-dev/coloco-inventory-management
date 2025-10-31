import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/lib/contexts/language-context"
import { IntlProvider } from "@/lib/providers/intl-provider"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Arno Inventory Management",
  description: "Korean Cosmetics Global Inventory & Sales Management System",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <LanguageProvider>
          <IntlProvider>
            {children}
            <Toaster />
          </IntlProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
