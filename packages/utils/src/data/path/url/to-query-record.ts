// todo support array & object
import {trim} from 'es-toolkit/string'

// URLSearchParams 를 쓴느 것이 더 좋을까 ?
export interface ToQueryRecodeOptions {
  decodeKey?: DecodeQueryKey
  decodeValue?: DecodeQueryValue
}

export type DecodeQueryKey = (key: string) => string | number | symbol
export type DecodeQueryValue = (value: string) => any

/**
 * @deprecated
 */
export const decodeQueryValue = (value: string) => {
  return decodeURIComponent(value)
}

/**
 * @deprecated
 */
export const decodeQueryKey = (key: string) => {
  return key
}

const trimQueryKey = (key: string) => {
  return trim(key)
}

/**
 * @deprecated
 */
export const decodeQueryItem = (
  key: string,
  value: string = '',
  options: ToQueryRecodeOptions = {},
) => {
  const {decodeKey = decodeQueryKey, decodeValue = decodeQueryValue} = options

  return [decodeKey(trimQueryKey(key)), decodeValue(value)]
}

/**
 * @deprecated
 */
export const toQueryRecord = (query: string, options?: ToQueryRecodeOptions) => {
  const trimmedQuery: string = query.replace(/^\?/u, '')

  if (trimmedQuery === '') {
    return {}
  }

  const entries = trimmedQuery
    .split('&')
    .map((item: string) => {
      const separatorIndex = item.indexOf('=')

      if (separatorIndex === -1) {
        return [item, '']
      }

      return [item.slice(0, separatorIndex), item.slice(separatorIndex + 1)]
    })
    .map(([key, value]) => decodeQueryItem(key, value, options))

  return Object.fromEntries(entries)
}
