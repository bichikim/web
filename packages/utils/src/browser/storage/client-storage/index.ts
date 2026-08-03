import cookieJs from 'js-cookie'
import {jsonStringify} from 'src/data/serialization/json-stringify'
import {jsonParse} from 'src/data/serialization/json-parse'
import {getDocument} from 'src/browser/dom/get-document'

export type StorageAndCookieKind = 'local' | 'session' | 'cookie'
export type StorageKind = 'local' | 'session'
export type CookieStorageOptions = NonNullable<Parameters<typeof cookieJs.set>[2]>
export interface StorageOptions {
  /**
   * @default null
   */
  defaultValue?: any
}

export interface SetAnyStorageItemOptions extends StorageOptions, CookieStorageOptions {
  raw?: boolean
}

export const getCookieItem = (key: string, defaultValue: any = null, raw: boolean = false) => {
  const rowValue = cookieJs.get(key)

  if (rowValue !== undefined) {
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

export const setCookieItem = (
  key: string,
  data: any,
  options?: CookieStorageOptions,
  raw?: boolean,
) => {
  cookieJs.set(key, stringify(data, raw), options)
}

export const getStorage = (storage: StorageKind): Storage | undefined => {
  const {window} = globalThis

  if (!window) {
    return
  }

  try {
    if (storage === 'local') {
      return window.localStorage
    }

    return window.sessionStorage
  } catch {
    return undefined
  }
}

export const getStorageItem = (
  storage: StorageKind,
  key: string,
  defaultValue: any = null,
  raw: boolean = false,
) => {
  const _storage = getStorage(storage)

  if (!_storage) {
    return defaultValue
  }

  const rawValue = _storage.getItem(key)

  if (rawValue === null) {
    return defaultValue
  }

  return parse(rawValue, defaultValue, raw)
}

export const setStorageItem = (
  storage: StorageKind,
  key: string,
  data: any = {},
  raw: boolean = false,
) => {
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
  options?: SetAnyStorageItemOptions,
) => {
  const raw = options?.raw ?? false

  switch (kind) {
    case 'cookie': {
      const {
        defaultValue: _defaultValueOmitted,
        raw: _rawOmitted,
        ...cookieAttributes
      } = options ?? {}
      return setCookieItem(key, value, cookieAttributes, raw)
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
    document.cookie = cookie
      .replace(/^ +/u, '')
      .replace(/[=].*/u, `=;expires=${new Date().toUTCString()};path=/`)
  }
}

export interface StorageReturn<T = any> {
  get: (key: string, raw?: boolean) => T
  set: (key: string, value: T, raw?: boolean) => void
}

export function createClientStorage<T = any>(
  kind: 'local',
  options?: StorageOptions,
  raw?: boolean,
): StorageReturn<T>
export function createClientStorage<T = any>(
  kind: 'session',
  options?: StorageOptions,
  raw?: boolean,
): StorageReturn<T>
export function createClientStorage<T = any>(
  kind: 'cookie',
  options?: CookieStorageOptions & StorageOptions,
  raw?: boolean,
): StorageReturn<T>

export function createClientStorage(
  kind: StorageAndCookieKind,
  options: Record<string, any> = {},
  defaultRaw: boolean = false,
) {
  const {defaultValue = null} = options

  const get = (key: string, raw: boolean = defaultRaw) => {
    return getAnyStorageItem(kind, key, defaultValue, raw)
  }

  const set = (key: string, value: any, raw: boolean = defaultRaw) => {
    return setAnyStorageItem(kind, key, value, {...options, raw})
  }

  return {get, set}
}

/** @deprecated Use `createClientStorage` instead. */
export const storage = createClientStorage
