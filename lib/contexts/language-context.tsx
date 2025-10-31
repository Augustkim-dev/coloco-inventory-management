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

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(defaultLocale)
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  // Initialize language from localStorage, DB, or browser
  useEffect(() => {
    const initializeLanguage = async () => {
      try {
        // Priority 1: Check if user is logged in and has a preference in DB
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
            setIsLoading(false)
            return
          }
        }

        // Priority 2: Check localStorage
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored && locales.includes(stored as Language)) {
          setLanguageState(stored as Language)
          setIsLoading(false)
          return
        }

        // Priority 3: Use browser language
        const browserLang = navigator.language.split('-')[0]
        if (locales.includes(browserLang as Language)) {
          setLanguageState(browserLang as Language)
          localStorage.setItem(STORAGE_KEY, browserLang)
          setIsLoading(false)
          return
        }

        // Priority 4: Use default
        setLanguageState(defaultLocale)
        localStorage.setItem(STORAGE_KEY, defaultLocale)
      } catch (error) {
        console.error('Error initializing language:', error)
        setLanguageState(defaultLocale)
      } finally {
        setIsLoading(false)
      }
    }

    initializeLanguage()
  }, [supabase])

  // Function to change language
  const setLanguage = useCallback(async (newLanguage: Language) => {
    try {
      // Update state
      setLanguageState(newLanguage)

      // Update localStorage
      localStorage.setItem(STORAGE_KEY, newLanguage)

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
