import cookieJs, {CookieAttributes} from 'js-cookie'
import {jsonStringify} from 'src/json-stringfy'
import {jsonParse} from 'src/json-parse'
import {getDocument} from 'src/get-document'

export type StorageAndCookieKind = 'local' | 'session' | 'cookie'
export type StorageKind = 'local' | 'session'
export type CookieStorageOptions = CookieAttributes
export interface StorageOptions {
  /**
   * @default null
   */
  defaultValue?: any
}

export const getCookieItem = (key: string, defaultValue: any = null, raw: boolean = false) => {
  const rowValue = cookieJs.get(key)

  if (rowValue) {
    return parse(rowValue, defaultValue, raw)
  }

  return defaultValue
}

const stringify = (data: any, raw?: boolean) => {
  return raw ? data : jsonStringify(data)
}

const parse = (data: any, defaultValue?: any, raw?: boolean) => {
  return raw ? data : jsonParse(data, defaultValue)
}

export const setCookieItem = (key: string, data: any, options?: CookieStorageOptions, raw?: boolean) => {
  cookieJs.set(key, stringify(data, raw), options)
}

export const getStorage = (storage: StorageKind): Storage | undefined => {
  const {window} = globalThis

  if (!window) {
    return
  }

  if (storage === 'local') {
    return window.localStorage
  }

  return window.sessionStorage
}

export const getStorageItem = (storage: StorageKind, key: string, defaultValue: any = null, raw: boolean = false) => {
  const _storage = getStorage(storage)

  if (!_storage) {
    return defaultValue
  }

  const rawValue = _storage.getItem(key)

  return parse(rawValue, defaultValue, raw)
}

export const setStorageItem = (storage: StorageKind, key: string, data: any = {}, raw: boolean = false) => {
  const _storage = getStorage(storage)

  if (!_storage) {
    return
  }

  _storage.setItem(key, stringify(data, raw))
}

export const getAnyStorageItem = (
  kind: StorageAndCookieKind,
  key: string,
  defaultValue: any = null,
  raw: boolean = false,
) => {
  switch (kind) {
    case 'cookie': {
      return getCookieItem(key, defaultValue, raw)
    }

    case 'local': {
      return getStorageItem('local', key, defaultValue, raw)
    }

    case 'session': {
      return getStorageItem('session', key, defaultValue, raw)
    }
  }
}

export const setAnyStorageItem = (
  kind: StorageAndCookieKind,
  key: string,
  value: any,
  options?: CookieStorageOptions,
  raw: boolean = false,
) => {
  switch (kind) {
    case 'cookie': {
      return setCookieItem(key, value, options, raw)
    }

    case 'local': {
      return setStorageItem('local', key, value, raw)
    }

    case 'session': {
      return setStorageItem('session', key, value, raw)
    }
  }
}

export const cleanAllCookie = () => {
  const document = getDocument()

  if (!document) {
    return
  }

  for (const cookie of document.cookie.split(';')) {
    document.cookie = cookie.replace(/^ +/u, '').replace(/[=].*/u, `=;expires=${new Date().toUTCString()};path=/`)
  }
}

export interface StorageReturn<T = any> {
  get: (key: string, raw?: boolean) => T
  set: (key: string, value: T, raw?: boolean) => void
}

export function storage<T = any>(kind: 'local', options?: StorageOptions, raw?: boolean): StorageReturn<T>
export function storage<T = any>(kind: 'session', options?: StorageOptions, raw?: boolean): StorageReturn<T>
export function storage<T = any>(
  kind: 'cookie',
  options?: CookieStorageOptions & StorageOptions,
  raw?: boolean,
): StorageReturn<T>

export function storage(kind: StorageAndCookieKind, options: Record<string, any> = {}) {
  const {defaultValue = null} = options

  const get = (key: string, raw: boolean = false) => {
    return getAnyStorageItem(kind, key, defaultValue, raw)
  }

  const set = (key: string, value: any, raw: boolean = false) => {
    return setAnyStorageItem(kind, key, value, options, raw)
  }

  return {get, set}
}
