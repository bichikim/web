import {useTranslations} from './use-translations'
import {english} from './messages'
import type {LocalizedMessage, MessageKey} from './types'

/** Localizes known diagnostics and preserves messages supplied by external systems. */
export const useLocalizedMessage = () => {
  const translate = useTranslations()
  return (message: string | LocalizedMessage): string => {
    if (typeof message !== 'string') {
      return translate(message.key, message.values)
    }
    return Object.hasOwn(english, message) ? translate(message as MessageKey) : message
  }
}
