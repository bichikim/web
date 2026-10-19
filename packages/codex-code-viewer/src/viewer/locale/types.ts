import type {english} from './messages'

export type ViewerLanguage = 'ko' | 'en'
export type LanguagePreference = 'auto' | ViewerLanguage
export type MessageKey = keyof typeof english
export type MessageValues = Readonly<Record<string, string | number>>
export interface LocalizedMessage {
  readonly key: MessageKey
  readonly values?: MessageValues
}
