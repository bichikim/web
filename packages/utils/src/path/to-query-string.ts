import {trim} from 'es-toolkit/compat'
import {joinStringQueries} from './join-string-queries'

export interface ToQueryStringOptions {
  encodeKey?: EncodeQueryKey
  encodeValue?: EncodeQueryValue
  sort?: (aKey, bKey) => number
}

export type EncodeQueryKey = (key?: string | undefined) => string
export type EncodeQueryValue = (value: unknown) => string

const TRIM_QUERY_REGEX = /^[?&]/u
/**
 * @deprecated
 */
export const removeQueryChar = (value: string) => trim(value).replace(TRIM_QUERY_REGEX, '')
/**
 * @deprecated
 */
export const encodeQueryKey = (key: string) => encodeURIComponent(key)

const trimQueryKey = (key: string): string => {
  const _key = removeQueryChar(trim(key))

  if (_key.length === 0) {
    return ''
  }

  return _key
}
/**
 * @deprecated
 */
export const encodeQueryValue = (value: string | number | boolean) => encodeURIComponent(value)

/**
 * @deprecated
 */
export const encodeQueryItem = (
  key: string,
  value: string | number | boolean,
  options: Omit<ToQueryStringOptions, 'sort'> = {},
) => {
  const {encodeKey = encodeQueryKey, encodeValue = encodeQueryValue} = options

  return `${encodeKey(trimQueryKey(key))}=${encodeValue(value)}`
}

/**
 * @deprecated
 */
export const encodeQueryRecord = (
  record: Record<string, string | number | boolean>,
  options: ToQueryStringOptions = {},
) => {
  const {sort} = options
  let entries = Object.entries(record)

  if (sort) {
    entries = entries.sort(sort)
  }

  return entries.map(([key, value]) => encodeQueryItem(key, value))
}

/**
 * @deprecated
 */
export const toQueryString = (record: Record<string, string | number | boolean>, options?: ToQueryStringOptions) => {
  return joinStringQueries(encodeQueryRecord(record, options))
}
