import {english} from './messages'
import {japanese} from './japanese'
import {chinese} from './chinese'
import {spanish} from './spanish'
import type {MessageCatalog, ViewerLanguage} from './types'

export const catalogs: Readonly<Record<Exclude<ViewerLanguage, 'ko'>, MessageCatalog>> = {
  en: english,
  es: spanish,
  ja: japanese,
  'zh-CN': chinese,
}
