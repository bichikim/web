import cookieJs, {CookieAttributes} from 'js-cookie'
import {getWindow} from 'src/get-window'
import {jsonParse} from 'src/json-parse'
import {jsonStringify} from 'src/json-stringfy'

export type StorageAndCookieKind = 'local' | 'session' | 'cookie'
export type StorageKind = 'local' | 'session'
export type CookieStorageOptions = CookieAttributes

export const getCookieItem = (key: string) => {
  return cookieJs.get(key)
}

export const setCookieItem = (key: string, data: any, options?: CookieStorageOptions) => {
  cookieJs.set(key, data, options)
}

export const getStorage = (storage: StorageKind): Storage | undefined => {
  const window = getWindow()
  if (!window) {
    return
  }

  if (storage === 'local') {
    return window.localStorage
  }
  return window.sessionStorage
}

export const getStorageItem = (storage: StorageKind, key: string, defaultValue: any = null) => {
  const _storage = getStorage(storage)
  if (!_storage) {
    return defaultValue
  }
  const rawValue = _storage.getItem(key)
  return jsonParse(rawValue, defaultValue)
}

export const setStorageItem = (storage: StorageKind, key: string, data: any = {}) => {
  const _storage = getStorage(storage)
  if (!_storage) {
    return
  }
  _storage.setItem(key, jsonStringify(data))
}

export function createStorage(kind: 'local', options?: Record<string, any>): any
export function createStorage(kind: 'session', options?: Record<string, any>): any
export function createStorage(kind: 'cookie', options?: CookieStorageOptions): any
export function createStorage(kind: StorageAndCookieKind, options?: Record<string, any>) {
  const get = (key: string) => {
    switch (kind) {
      // eslint-disable-next-line switch-colon-spacing
      case 'cookie': {
        return getCookieItem(key)
      }
      case 'local': {
        return getStorageItem('local', key)
      }
      case 'session': {
        return getStorageItem('session', key)
      }
    }
  }

  const set = (key: string, value: any) => {
    switch (kind) {
      case 'cookie': {
        return setCookieItem(key, value, options)
      }
      case 'local': {
        return setStorageItem('local', key, value)
      }
      case 'session': {
        return setStorageItem('session', key, value)
      }
    }
  }

  return {get, set}
}
