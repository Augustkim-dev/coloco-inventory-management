import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { Toaster } from "@/components/ui/toaster"
import { LanguageProvider } from "@/lib/contexts/language-context"
import { IntlProvider } from "@/lib/providers/intl-provider"
import { cookies } from "next/headers"
import { defaultLocale, locales } from "@/i18n"
import { Language } from "@/types"
import { getAllMessages } from "@/lib/i18n/get-all-messages"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Arno Inventory Management",
  description: "Korean Cosmetics Global Inventory & Sales Management System",
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Get language from cookie (for non-authenticated routes like login page)
  const cookieStore = await cookies()
  const cookieLanguage = cookieStore.get('preferred-language')?.value
  const initialLanguage = (
    cookieLanguage && locales.includes(cookieLanguage as Language)
      ? cookieLanguage
      : defaultLocale
  ) as Language

  // Pre-load messages on server to avoid client-side loading spinner
  const initialMessages = await getAllMessages(initialLanguage)

  return (
    <html lang={initialLanguage}>
      <body className={inter.className}>
        <LanguageProvider initialLanguage={initialLanguage}>
          <IntlProvider initialMessages={initialMessages}>
            {children}
            <Toaster />
          </IntlProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
