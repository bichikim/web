import {Tokenizer} from '@huggingface/tokenizers'
import {readObject} from './manifest'
import type {SpecialTokens} from './types'

export const resolveSpecialTokens = (
  tokenizer: Tokenizer,
  configuration: object,
): SpecialTokens => {
  const settings = readObject(configuration)
  const text = (name: string, fallback: string): string => {
    const entry = settings[name]
    if (entry === undefined) {
      return fallback
    }
    if (typeof entry === 'string') {
      return entry
    }
    const token = readObject(entry).content
    if (typeof token !== 'string') {
      throw new TypeError(`Invalid special token: ${name}`)
    }
    return token
  }
  const id = (token: string): number => {
    const value = tokenizer.token_to_id(token)
    if (value === undefined) {
      throw new Error(`Missing special token: ${token}`)
    }
    return value
  }
  const maskToken = text('mask_token', '[MASK]')
  return {
    cls: id(text('cls_token', '[CLS]')),
    mask: id(maskToken),
    maskToken,
    pad: id(text('pad_token', '[PAD]')),
    sep: id(text('sep_token', '[SEP]')),
  }
}
