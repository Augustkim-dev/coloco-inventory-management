'use client'

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { Language } from '@/types'
import { defaultLocale, locales } from '@/i18n'
import { createClient } from '@/lib/supabase/client'

const STORAGE_KEY = 'preferred-language'

interface LanguageContextType {
  language: Language
  setLanguage: (language: Language) => Promise<void>
  isLoading: boolean
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined)

interface LanguageProviderProps {
  children: React.ReactNode
  /**
   * Initial language from server (e.g., from user profile).
   * If provided, skips the expensive client-side DB lookup.
   */
  initialLanguage?: Language
}

export function LanguageProvider({ children, initialLanguage }: LanguageProviderProps) {
  const [language, setLanguageState] = useState<Language>(initialLanguage || defaultLocale)
  // If initialLanguage provided, we don't need to load from DB
  const [isLoading, setIsLoading] = useState(!initialLanguage)
  const supabase = createClient()

  // Initialize language from localStorage, DB, or browser
  // Skip entirely if initialLanguage was provided from server
  useEffect(() => {
    // If server already provided the language, just sync to storage and skip DB call
    if (initialLanguage) {
      localStorage.setItem(STORAGE_KEY, initialLanguage)
      document.cookie = `preferred-language=${initialLanguage}; path=/; max-age=31536000; SameSite=Lax`
      setIsLoading(false)
      return
    }

    const initializeLanguage = async () => {
      try {
        // Priority 1: Check localStorage first (fastest, no network call)
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored && locales.includes(stored as Language)) {
          setLanguageState(stored as Language)
          document.cookie = `preferred-language=${stored}; path=/; max-age=31536000; SameSite=Lax`
          setIsLoading(false)
          return
        }

        // Priority 2: Check if user is logged in and has a preference in DB
        // Only for non-authenticated routes (login page) where initialLanguage wasn't passed
        const { data: { user } } = await supabase.auth.getUser()

        if (user) {
          const { data: userData } = await supabase
            .from('users')
            .select('preferred_language')
            .eq('id', user.id)
            .single()

          if (userData?.preferred_language && locales.includes(userData.preferred_language as Language)) {
            setLanguageState(userData.preferred_language as Language)
            localStorage.setItem(STORAGE_KEY, userData.preferred_language)
            document.cookie = `preferred-language=${userData.preferred_language}; path=/; max-age=31536000; SameSite=Lax`
            setIsLoading(false)
            return
          }
        }

        // Priority 3: Use browser language
        const browserLang = navigator.language.split('-')[0]
        if (locales.includes(browserLang as Language)) {
          setLanguageState(browserLang as Language)
          localStorage.setItem(STORAGE_KEY, browserLang)
          document.cookie = `preferred-language=${browserLang}; path=/; max-age=31536000; SameSite=Lax`
          setIsLoading(false)
          return
        }

        // Priority 4: Use default
        setLanguageState(defaultLocale)
        localStorage.setItem(STORAGE_KEY, defaultLocale)
        document.cookie = `preferred-language=${defaultLocale}; path=/; max-age=31536000; SameSite=Lax`
      } catch (error) {
        console.error('Error initializing language:', error)
        setLanguageState(defaultLocale)
      } finally {
        setIsLoading(false)
      }
    }

    initializeLanguage()
  }, [supabase, initialLanguage])

  // Function to change language
  const setLanguage = useCallback(async (newLanguage: Language) => {
    try {
      // Update state
      setLanguageState(newLanguage)

      // Update localStorage
      localStorage.setItem(STORAGE_KEY, newLanguage)

      // Update cookie for server-side access
      document.cookie = `preferred-language=${newLanguage}; path=/; max-age=31536000; SameSite=Lax`

      // Update DB if user is logged in
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
        await supabase
          .from('users')
          .update({ preferred_language: newLanguage })
          .eq('id', user.id)
      }
    } catch (error) {
      console.error('Error setting language:', error)
    }
  }, [supabase])

  return (
    <LanguageContext.Provider value={{ language, setLanguage, isLoading }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider')
  }
  return context
}
