'use client'

import { useLanguage } from '@/lib/contexts/language-context'
import { Language } from '@/types'
import { languageNames, languageFlags, locales } from '@/i18n'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Globe } from 'lucide-react'

export function LanguageSwitcher() {
  const { language, setLanguage, isLoading } = useLanguage()

  const handleLanguageChange = async (value: string) => {
    await setLanguage(value as Language)
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 text-sm text-muted-foreground">
        <Globe className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    )
  }

  return (
    <Select value={language} onValueChange={handleLanguageChange}>
      <SelectTrigger className="w-[180px] bg-gray-800 text-white border-gray-700 hover:bg-gray-700">
        <div className="flex items-center gap-2 w-full">
          <Globe className="h-4 w-4 flex-shrink-0" />
          <div className="flex items-center gap-2">
            <span>{languageFlags[language]}</span>
            <span>{languageNames[language]}</span>
          </div>
        </div>
      </SelectTrigger>
      <SelectContent>
        {locales.map((locale) => (
          <SelectItem key={locale} value={locale}>
            <div className="flex items-center gap-2">
              <span>{languageFlags[locale]}</span>
              <span>{languageNames[locale]}</span>
            </div>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
