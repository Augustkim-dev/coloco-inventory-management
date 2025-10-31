'use client'

import { NextIntlClientProvider } from 'next-intl'
import { useLanguage } from '@/lib/contexts/language-context'
import { useEffect, useState } from 'react'

export function IntlProvider({ children }: { children: React.ReactNode }) {
  const { language, isLoading } = useLanguage()
  const [messages, setMessages] = useState<any>({
    navigation: {},
    auth: {},
    products: {},
    sales: {},
    pricing: {},
    dashboard: {},
    inventory: {},
    suppliers: {},
    locations: {},
    exchangeRates: {},
  })

  useEffect(() => {
    async function loadMessages() {
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
      }
    }

    if (!isLoading) {
      loadMessages()
    }
  }, [language, isLoading])

  // Always provide the context, even with empty messages during loading
  return (
    <NextIntlClientProvider locale={language} messages={messages}>
      {children}
    </NextIntlClientProvider>
  )
}
