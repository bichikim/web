import korean from '../../../.i18n/messages/ko.json'
import english from '../../../.i18n/messages/en.json'
import type {InterfaceLanguage, MessageValues} from './types'

export type MessageKey = keyof typeof korean
const catalogs: Readonly<Record<InterfaceLanguage, Readonly<Record<MessageKey, string>>>> = {
  en: english,
  ko: korean,
}

export const translate = (
  language: InterfaceLanguage,
  message: MessageKey,
  values: MessageValues = {},
): string =>
  catalogs[language][message].replace(/\{(?<key>\w+)\}/gu, (placeholder, key: string) =>
    Object.hasOwn(values, key) ? String(values[key]) : placeholder,
  )

interface MessagePattern {
  readonly key: MessageKey
  readonly parameters: readonly string[]
  readonly expression: RegExp
}

const patterns: readonly MessagePattern[] = (Object.keys(korean) as MessageKey[])
  .filter((key) => key.includes('{'))
  .flatMap((key) =>
    (['ko', 'en'] as const).map((language) => {
      const parameters: string[] = []
      const expression = catalogs[language][key]
        .split(/(?<placeholder>\{\w+\})/gu)
        .map((part) => {
          if (/^\{\w+\}$/u.test(part)) {
            parameters.push(part.slice(1, -1))
            return '(.*?)'
          }
          return part.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
        })
        .join('')
      return {expression: new RegExp(`^${expression}$`, 'su'), key, parameters}
    }),
  )

const englishKeys = new Map(
  Object.entries(english).map(([key, value]) => [value, key as MessageKey]),
)

export const translateLiteral = (language: InterfaceLanguage, message: string): string =>
  Object.hasOwn(korean, message) ? translate(language, message as MessageKey) : message

export const translateKnown = (language: InterfaceLanguage, message: string): string => {
  if (Object.hasOwn(korean, message)) {
    return translate(language, message as MessageKey)
  }
  const original = englishKeys.get(message)
  if (original !== undefined) {
    return translate(language, original)
  }
  for (const pattern of patterns) {
    const matched = pattern.expression.exec(message)
    if (matched !== null) {
      const values = Object.fromEntries(
        pattern.parameters.map((key, index) => [key, matched[index + 1] ?? '']),
      )
      return translate(language, pattern.key, values)
    }
  }
  return message
}
