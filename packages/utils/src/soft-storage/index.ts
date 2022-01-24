import {isSSR} from '../'
import cookie, {CookieAttributes} from 'js-cookie'
import stringify from 'fast-json-stable-stringify'

export type BrowserStorageKind = 'session' | 'local' | 'cookie'

export type CookieStorageOptions = CookieAttributes

export interface SoftStorage<Data, Options extends Record<string, any> | undefined = undefined> {
  getItem(name: string): Data | undefined
  setItem(name: string, value: Data, options?: Options): void
}

const getBrowserStorageModule = (kind: BrowserStorageKind): Storage => {
  if (kind === 'session') {
    return sessionStorage
  }
  return localStorage
}

export function createSoftBrowserStorage<Data>(kind: BrowserStorageKind): SoftStorage<Data>
export function createSoftBrowserStorage<Data>(kind: 'local'): SoftStorage<Data>
export function createSoftBrowserStorage<Data>(kind: 'session'): SoftStorage<Data>
export function createSoftBrowserStorage<Data>(kind: 'cookie'): SoftStorage<Data, CookieStorageOptions>
export function createSoftBrowserStorage<Data>(kind: BrowserStorageKind): SoftStorage<Data> {
  if (kind === 'cookie') {
    return createCookieSoftStorage<Data>()
  }
  return {
    getItem(name: string) {
      if (isSSR()) {
        return
      }
      const storage = getBrowserStorageModule(kind)
      try {
        const result = storage.getItem(name)
        if (result !== null) {
          return JSON.parse(result)
        }
      } catch {
        // ignore
      }
    },
    setItem(name: string, value: any) {
      if (isSSR()) {
        return
      }
      const storage = getBrowserStorageModule(kind)
      const data = stringify(value)
      storage.setItem(name, data)
    },
  }
}

export const createCookieSoftStorage =
  <Data>(): SoftStorage<Data, CookieStorageOptions> => ({
    getItem(name: string) {
      if (isSSR()) {
        return
      }
      try {
        const result = cookie.get(name)
        if (typeof result !== 'undefined') {
          return JSON.parse(result)
        }
      } catch {
      // ignore
      }
    },
    setItem(name: string, value: any, options?) {
      if (isSSR()) {
        return
      }
      cookie.set(name, stringify(value), options)
    },
  })

export const localSoftStorage = createSoftBrowserStorage('local')
export const sessionSoftStorage = createSoftBrowserStorage('session')
export const cookieSoftStorage = createSoftBrowserStorage('cookie')

