import {isSSR} from '../'
import cookie, {CookieAttributes} from 'js-cookie'
import stringify from 'fast-json-stable-stringify'

export type BrowserStorageKind = 'session' | 'local' | 'cookie'

export type CookieStorageOptions = CookieAttributes

export interface SoftStorage<Data, Options extends Record<string, any> | undefined = undefined> {
  getItem(name: string): Data | undefined
  setItem(name: string, value: Data, options?: Options): void
}

export interface SoftStorage2<Data> {
  getItem(name: string): Data | undefined
  setItem(name: string, value: Data): void
}

export type SoftStorageFunction<Data, Options extends Record<string, any> | undefined = undefined> =
  <NewData = undefined>
(options?: Options) => SoftStorage2<NewData extends undefined ? Data : NewData>

const getBrowserStorageModule = (kind: BrowserStorageKind): Storage => {
  if (kind === 'session') {
    return globalThis.sessionStorage
  }
  return globalThis.localStorage
}

/**
 * @deprecated please use createBrowserStorage
 * @param kind
 */
export function createSoftBrowserStorage<Data>(kind: BrowserStorageKind):
  SoftStorage<Data, Record<string, any> | undefined>
export function createSoftBrowserStorage<Data>(kind: 'local'): SoftStorage<Data>
export function createSoftBrowserStorage<Data>(kind: 'session'): SoftStorage<Data>
export function createSoftBrowserStorage<Data>(kind: 'cookie'): SoftStorage<Data, CookieStorageOptions>
export function createSoftBrowserStorage<Data>(kind: BrowserStorageKind) {
  if (kind === 'cookie') {
    return createCookieSoftStorage<Data>()
  }
  return {
    getItem(name: string) {
      if (isSSR()) {
        return
      }
      const storage = getBrowserStorageModule(kind)
      // eslint-disable-next-line functional/no-try-statement
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
      // eslint-disable-next-line functional/no-try-statement
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

export function createBrowserStorage<Data>(kind: BrowserStorageKind):
  SoftStorageFunction<Data, Record<string, any> | undefined>
export function createBrowserStorage<Data>(kind: 'cookie'): SoftStorageFunction<Data, CookieStorageOptions>
export function createBrowserStorage<Data>(kind: 'local'): SoftStorageFunction<Data>
export function createBrowserStorage<Data>(kind: 'session'): SoftStorageFunction<Data>
export function createBrowserStorage<Data>(kind: BrowserStorageKind) {
  if (kind === 'cookie') {
    return createCookieStorage<Data>()
  }
  return () => {
    return {
      getItem(name: string) {
        if (isSSR()) {
          return
        }
        const storage = getBrowserStorageModule(kind)
        // eslint-disable-next-line functional/no-try-statement
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
}

export const createCookieStorage =
  <Data>(_innerOptions?: CookieStorageOptions): SoftStorageFunction<Data, CookieStorageOptions> => {
    return (options?) => {
      const newOptions = {..._innerOptions, ...options}
      return {
        getItem(name: string) {
          if (isSSR()) {
            return
          }
          // eslint-disable-next-line functional/no-try-statement
          try {
            const result = cookie.get(name)
            if (typeof result !== 'undefined') {
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
          cookie.set(name, stringify(value), newOptions)
        },
      }
    }
  }

/**
 * @deprecated please use localStorage instead
 */
export const localSoftStorage = createSoftBrowserStorage('local')
/**
 * @deprecated please use localStorage
 */
export const sessionSoftStorage = createSoftBrowserStorage('session')
/**
 * @deprecated please use localStorage
 */
export const cookieSoftStorage = createSoftBrowserStorage('cookie')

export const localStorage = createBrowserStorage('local')
export const sessionStorage = createBrowserStorage('session')
export const cookieStorage = createBrowserStorage('cookie')

