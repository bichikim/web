import {CookieSerializeOptions} from 'cookie-es'
import {createSignal, createEffect, onMount, Accessor, Setter} from 'solid-js'
import {getClientCookie, getServerCookie, setClientCookie, setServerCookie} from 'src/utils/cookie'

const getCookieValue = (key: string) => {
  if (import.meta.env.SSR) {
    return getServerCookie(key)
  }

  return getClientCookie(key)
}

export const useCookieStorage = (
  key: string,
  initValue: any,
  options?: Accessor<CookieSerializeOptions>,
): [Accessor<any>, Setter<any>] => {
  const [value, setValue] = createSignal(getCookieValue(key) ?? initValue)

  createEffect(() => {
    const _value = value()
    const _options = options?.()

    if (import.meta.env.SSR) {
      setServerCookie(key, _value, _options)
    } else {
      setClientCookie(key, _value, _options)
    }
  })

  return [value, setValue]
}

export const useClientStorage = (
  kind: 'local' | 'session',
  key: string,
  initValue: any,
): [Accessor<any>, Setter<any>] => {
  const [value, setValue] = createSignal(initValue)

  onMount(() => {
    if (import.meta.env.SSR) {
      return
    }

    const _value = kind === 'local' ? localStorage.getItem(key) : sessionStorage.getItem(key)

    if (_value) {
      setValue(_value)
    }
  })

  createEffect(() => {
    const _value = value()

    if (import.meta.env.SSR) {
      return
    }

    if (kind === 'local') {
      localStorage.setItem(key, _value)
    } else {
      sessionStorage.setItem(key, _value)
    }
  })

  return [value, setValue]
}

export function useStorage<T>(
  kind: 'cookie',
  key: string,
  initValue: T,
  options?: Accessor<CookieSerializeOptions>,
): [Accessor<any>, Setter<any>]

export function useStorage<T>(kind: 'local' | 'session', key: string, initValue: T): [Accessor<T>, Setter<T>]

export function useStorage<T>(kind: any, key: string, initValue: T, options?: any): [Accessor<T>, Setter<T>] {
  if (kind === 'cookie') {
    return useCookieStorage(key, initValue, options)
  }

  return useClientStorage(kind, key, initValue)
}
