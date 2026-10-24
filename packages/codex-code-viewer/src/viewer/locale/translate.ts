import {english} from './messages'
import {catalogs} from './catalogs'
import type {MessageKey, MessageValues, ViewerLanguage} from './types'

export const translate = (
  language: ViewerLanguage,
  message: MessageKey,
  values: MessageValues = {},
): string => {
  const template = language === 'ko' ? message : (catalogs[language][message] ?? english[message])
  return template.replace(/\{(?<key>\w+)\}/gu, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  )
}
