import { defaultLocale } from '@/i18n'
import { Language } from '@/types'
import { cookies } from 'next/headers'

// Helper to get server-side translations
export async function getServerTranslations(namespace: string) {
  // Try to get language from cookie (set by client-side language provider)
  const cookieStore = await cookies()
  const language = (cookieStore.get('preferred-language')?.value || defaultLocale) as Language

  try {
    const messages = await import(`@/locales/${language}/${namespace}.json`)
    return messages.default
  } catch (error) {
    console.error(`Error loading ${namespace} translations for ${language}:`, error)
    // Fallback to English
    const fallbackMessages = await import(`@/locales/en/${namespace}.json`)
    return fallbackMessages.default
  }
}

// Helper to get common translations
export async function getCommonTranslations() {
  return getServerTranslations('common')
}
