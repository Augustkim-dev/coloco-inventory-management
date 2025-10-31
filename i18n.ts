import { notFound } from 'next/navigation'
import { getRequestConfig } from 'next-intl/server'
import { Language } from './types'

// Supported languages
export const locales: Language[] = ['en', 'ko', 'vi', 'zh']
export const defaultLocale: Language = 'en'

// Language display names
export const languageNames: Record<Language, string> = {
  en: 'English',
  ko: '한국어',
  vi: 'Tiếng Việt',
  zh: '中文',
}

// Language flags (emoji)
export const languageFlags: Record<Language, string> = {
  en: '🇬🇧',
  ko: '🇰🇷',
  vi: '🇻🇳',
  zh: '🇨🇳',
}

export default getRequestConfig(async ({ locale }) => {
  // Validate that the incoming `locale` parameter is valid
  const validLocale = locale && locales.includes(locale as Language) ? locale : defaultLocale

  if (!locale || !locales.includes(locale as Language)) {
    notFound()
  }

  // Load all translation files and merge them
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
    import(`./locales/${validLocale}/common.json`),
    import(`./locales/${validLocale}/navigation.json`),
    import(`./locales/${validLocale}/auth.json`),
    import(`./locales/${validLocale}/products.json`),
    import(`./locales/${validLocale}/sales.json`),
    import(`./locales/${validLocale}/pricing.json`),
    import(`./locales/${validLocale}/dashboard.json`),
    import(`./locales/${validLocale}/inventory.json`),
    import(`./locales/${validLocale}/suppliers.json`),
    import(`./locales/${validLocale}/locations.json`),
    import(`./locales/${validLocale}/exchangeRates.json`),
  ])

  return {
    locale: validLocale,
    messages: {
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
    },
  }
})
