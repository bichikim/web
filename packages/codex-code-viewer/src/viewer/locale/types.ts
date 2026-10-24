import type {english} from './messages'
import type {VIEWER_LANGUAGES} from './languages'

export type ViewerLanguage = (typeof VIEWER_LANGUAGES)[number]['value']
export type LanguagePreference = 'auto' | ViewerLanguage
export type MessageKey = keyof typeof english
export type MessageValues = Readonly<Record<string, string | number>>
export type MessageCatalog = Readonly<Partial<Record<MessageKey, string>>>
export interface LocalizedMessage {
  readonly key: MessageKey
  readonly values?: MessageValues
}
