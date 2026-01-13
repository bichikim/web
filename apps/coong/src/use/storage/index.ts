import {CookieSerializeOptions} from 'cookie-es'
import {Accessor, createSignal, onMount, Setter, Signal} from 'solid-js'
import {getClientCookie, getServerCookie, setClientCookie, setServerCookie} from 'src/utils/cookie'
import {createEffectInitialize} from 'src/use/effect-initialize'
import {isServer} from 'solid-js/web'

const getCookieValue = (key: string) => {
  if (isServer) {
    return getServerCookie(key)
  }

  return getClientCookie(key)
}

const setCookieValue = (key: string, value: string, options?: CookieSerializeOptions) => {
  if (isServer) {
    setServerCookie(key, value, options)
  } else {
    setClientCookie(key, value, options)
  }
}

const serialize = (value: any): string => {
  if (typeof value === 'string') {
    return value
  }

  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

const deserialize = <T>(value: string | null | undefined, initValue: T): T => {
  if (value === null || value === undefined) {
    return initValue
  }

  try {
    return JSON.parse(value) as T
  } catch {
    return value as T
  }
}

export const useCookieStorage = <T>(
  key: string,
  initValue: T,
  options?: Accessor<CookieSerializeOptions>,
): Signal<T> => {
  const [value, setValue] = createSignal<T>(deserialize(getCookieValue(key), initValue))

  createEffectInitialize((isInitialMount) => {
    const serializedValue = serialize(value())

    if (isInitialMount) {
      return
    }

    setCookieValue(key, serializedValue, options?.())
  })

  return [value, setValue]
}

export const useClientStorage = <T>(kind: 'local' | 'session', key: string, initValue: T): [Accessor<T>, Setter<T>] => {
  const [value, setValue] = createSignal<T>(initValue)

  // get client storage value when mounted
  onMount(() => {
    // remove code in SSR
    if (isServer) {
      return
    }

    // take client storage
    const storage = kind === 'local' ? localStorage : sessionStorage
    const storedValue = storage.getItem(key)

    // if no value, skip
    if (storedValue === null) {
      return
    }

    const deserializedValue = deserialize(storedValue, initValue)

    setValue(() => deserializedValue)
  })

  createEffectInitialize((isInitialMount) => {
    const _value = value()

    // remove code in SSR
    if (isServer) {
      return
    }

    // Skip initial effect to avoid overwriting storage with initValue
    if (isInitialMount) {
      return
    }

    const storage = kind === 'local' ? localStorage : sessionStorage
    const serializedValue = serialize(_value)

    storage.setItem(key, serializedValue)
  })

  return [value, setValue]
}

export function useStorage<T>(
  kind: 'cookie',
  key: string,
  initValue: T,
  options?: Accessor<CookieSerializeOptions>,
): [Accessor<T>, Setter<T>]

export function useStorage<T>(kind: 'local' | 'session', key: string, initValue: T): [Accessor<T>, Setter<T>]

export function useStorage<T>(kind: any, key: string, initValue: T, options?: any): [Accessor<T>, Setter<T>] {
  if (kind === 'cookie') {
    return useCookieStorage(key, initValue, options)
  }

  return useClientStorage(kind, key, initValue)
}
