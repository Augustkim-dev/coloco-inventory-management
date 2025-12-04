import { cache } from 'react'
import { Language } from '@/types'
import { defaultLocale } from '@/i18n'

export type Messages = Record<string, any>

/**
 * Cached server-side message loader.
 * Loads all 11 translation files for a given language and merges them.
 * Uses React's cache() to deduplicate calls within the same request.
 */
export const getAllMessages = cache(async (language: Language = defaultLocale): Promise<Messages> => {
  try {
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

    return {
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
    }
  } catch (error) {
    console.error(`[getAllMessages] Error loading messages for ${language}:`, error)
    // Fallback to English if loading fails
    if (language !== 'en') {
      return getAllMessages('en')
    }
    // Return empty object if even English fails
    return {}
  }
})
