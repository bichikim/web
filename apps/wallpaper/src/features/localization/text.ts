import {interfaceLanguage} from './state'
import {type MessageKey, translate, translateKnown, translateLiteral} from './translate'
import type {MessageValues} from './types'

export const text = (message: MessageKey, values?: MessageValues): string =>
  translate(interfaceLanguage.language(), message, values)

export const localizeMessage = (message: string): string =>
  translateKnown(interfaceLanguage.language(), message)

export const localizeLiteral = (message: string): string =>
  translateLiteral(interfaceLanguage.language(), message)
