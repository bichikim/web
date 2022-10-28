import {joinQuery} from './join-query'

const TRIM_QUERY_REGX = /^[?&]/u

export const encodeQueryKey = (key: string): string | undefined => {
  const _key = key.replace(TRIM_QUERY_REGX, '')

  if (_key.length === 0) {
    return
  }

  return _key
}

export const encodeQueryRecord = (key: string, value: any) => {
  return `${encodeQueryKey(key)}=${encodeURIComponent(value)}`
}

export const toQueryString = (record: Record<string, any>) => {
  return joinQuery(Object.entries(record).map(([key, value]) => encodeQueryRecord(key, value)))
}