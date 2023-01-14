// todo support array & object
import {trim} from '@winter-love/lodash'

export interface ToQueryRecodeOptions {
  decodeKey?: DecodeQueryKey
  decodeValue?: DecodeQueryValue
}

export type DecodeQueryKey = (key: string) => string | number | symbol
export type DecodeQueryValue = (value: string) => any
export const decodeQueryValue = (value: string) => {
  return decodeURIComponent(value)
}

export const decodeQueryKey = (key: string) => {
  return key
}

const trimQueryKey = (key: string) => {
  return trim(key)
}

export const decodeQueryItem = (key: string, value: string, options: ToQueryRecodeOptions = {}) => {
  const {decodeKey = decodeQueryKey, decodeValue = decodeQueryValue} = options
  return [decodeKey(trimQueryKey(key)), decodeValue(value)]
}

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
