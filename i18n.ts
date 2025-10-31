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

  return {
    locale: validLocale,
    messages: (await import(`./locales/${validLocale}/common.json`)).default,
  }
})
