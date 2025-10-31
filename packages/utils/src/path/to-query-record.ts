// todo support array & object
import {trim} from 'es-toolkit/compat'

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
export const decodeQueryItem = (key: string, value: string, options: ToQueryRecodeOptions = {}) => {
  const {decodeKey = decodeQueryKey, decodeValue = decodeQueryValue} = options

  return [decodeKey(trimQueryKey(key)), decodeValue(value)]
}

/**
 * @deprecated
 */
export const toQueryRecord = (query: string, options?: ToQueryRecodeOptions) => {
  const trimmedQuery: string = query.replace(/^\?/u, '')

  const entries = trimmedQuery
    .split('&')
    .map((item: string) => {
      return item.split('=', 2)
    })
    .map(([key, value]) => decodeQueryItem(key, value, options))

  return Object.fromEntries(entries)
}
