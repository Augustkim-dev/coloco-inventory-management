'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useLanguage } from '@/lib/contexts/language-context'
import { useEffect, useState, useRef } from 'react'

interface IntlProviderProps {
  children: React.ReactNode
  /**
   * Pre-loaded messages from server.
   * If provided, skips the expensive client-side loading and removes the loading spinner.
   */
  initialMessages?: Record<string, any>
}

export function IntlProvider({ children, initialMessages }: IntlProviderProps) {
  const { language, isLoading } = useLanguage()
  const [messages, setMessages] = useState<any>(initialMessages || null)
  // Only show loading if we don't have initialMessages
  const [loading, setLoading] = useState(!initialMessages)
  // Track the language that initialMessages was loaded for
  const initialLanguageRef = useRef<string | null>(initialMessages ? language : null)

  useEffect(() => {
    // If we have initialMessages and language hasn't changed, skip loading
    if (initialMessages && initialLanguageRef.current === language) {
      setMessages(initialMessages)
      setLoading(false)
      return
    }

    // If language changed from initial, we need to reload
    // Or if we never had initialMessages
    async function loadMessages() {
      setLoading(true)
      try {
        // Load all message files for the selected language
        const [
          common,
          navigation,
          auth,
          products,
          sales,
          pricing,
          dashboard,
          inventory,
          suppliers,
          locations,
          exchangeRates,
        ] = await Promise.all([
          import(`@/locales/${language}/common.json`),
          import(`@/locales/${language}/navigation.json`),
          import(`@/locales/${language}/auth.json`),
          import(`@/locales/${language}/products.json`),
          import(`@/locales/${language}/sales.json`),
          import(`@/locales/${language}/pricing.json`),
          import(`@/locales/${language}/dashboard.json`),
          import(`@/locales/${language}/inventory.json`),
          import(`@/locales/${language}/suppliers.json`),
          import(`@/locales/${language}/locations.json`),
          import(`@/locales/${language}/exchangeRates.json`),
        ])

        setMessages({
          ...common.default,
          common: common.default,
          navigation: navigation.default,
          auth: auth.default,
          products: products.default,
          sales: sales.default,
          pricing: pricing.default,
          dashboard: dashboard.default,
          inventory: inventory.default,
          suppliers: suppliers.default,
          locations: locations.default,
          exchangeRates: exchangeRates.default,
        })
      } catch (error) {
        console.error('Error loading messages:', error)
      } finally {
        setLoading(false)
      }
    }

    // Only load if:
    // 1. We don't have initialMessages, or
    // 2. Language changed from the initial language
    if (!isLoading && (!initialMessages || initialLanguageRef.current !== language)) {
      loadMessages()
    }
  }, [language, isLoading, initialMessages])

  // Don't render children until messages are fully loaded
  // But if we have initialMessages, we can skip the spinner
  if (loading || !messages) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]" />
          <p className="mt-4 text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <NextIntlClientProvider locale={language} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
