import {useContext} from 'solid-js'
import {LocaleContext} from './context'
import {translate} from './translate'
import type {MessageKey, MessageValues} from './types'

export const useTranslations = () => {
  const language = useContext(LocaleContext)
  return (message: MessageKey, values?: MessageValues): string =>
    translate(language(), message, values)
}
