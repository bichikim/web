import {trim} from '@winter-love/lodash'
import {joinStringQueries} from './join-string-queries'

export interface ToQueryStringOptions {
  encodeKey?: EncodeQueryKey
  encodeValue?: EncodeQueryValue
  sort?: (aKey, bKey) => number
}

export type EncodeQueryKey = (key: string) => string
export type EncodeQueryValue = (value: any) => string

const TRIM_QUERY_REGEX = /^[?&]/u

export const removeQueryChar = (value: string) => trim(value).replace(TRIM_QUERY_REGEX, '')

export const encodeQueryKey = (key: string) => encodeURIComponent(key)
const trimQueryKey = (key: string): string | undefined => {
  const _key = removeQueryChar(trim(key))

  if (_key.length === 0) {
    return
  }

  return _key
}

export const encodeQueryValue = (value: any) => encodeURIComponent(value)

export const encodeQueryItem = (
  key: string,
  value: any,
  options: Omit<ToQueryStringOptions, 'sort'> = {},
) => {
  const {encodeKey = encodeQueryKey, encodeValue = encodeQueryValue} = options
  return `${encodeKey(trimQueryKey(key))}=${encodeValue(value)}`
}

export const encodeQueryRecord = (
  record: Record<string, any>,
  options: ToQueryStringOptions = {},
) => {
  const {sort} = options
  let entries = Object.entries(record)

  if (sort) {
    entries = entries.sort(sort)
  }

  return entries.map(([key, value]) => encodeQueryItem(key, value))
}

export const toQueryString = (record: Record<string, any>, options?: ToQueryStringOptions) => {
  return joinStringQueries(encodeQueryRecord(record, options))
}
