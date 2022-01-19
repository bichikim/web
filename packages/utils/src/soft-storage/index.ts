import {isSSR} from '@winter-love/utils'
import cookie, {CookieAttributes} from 'js-cookie'

export type BrowserStorageKind = 'session' | 'local' | 'cookie'

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

export function createSoftBrowserStorage<Data>(kind: 'local'): SoftStorage<Data>
export function createSoftBrowserStorage<Data>(kind: 'session'): SoftStorage<Data>
export function createSoftBrowserStorage<Data>(kind: 'cookie'): SoftStorage<Data, CookieAttributes>
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
      const data = JSON.stringify(value)
      storage.setItem(name, data)
    },
  }
}

export const createCookieSoftStorage =
  <Data>(): SoftStorage<Data, CookieAttributes> => ({
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
      cookie.set(name, JSON.stringify(value), options)
    },
  })

export const localSoftStorage = createSoftBrowserStorage('local')
export const sessionSoftStorage = createSoftBrowserStorage('session')
export const cookieSoftStorage = createSoftBrowserStorage('cookie')

