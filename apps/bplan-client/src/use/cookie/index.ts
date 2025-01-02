import jsCookie from 'js-cookie'
import {parse} from 'cookie'
import {getRequestEvent, isServer} from 'solid-js/web'
import {createSignal, Signal} from 'solid-js'
import {setCookie as _setServerCookie} from 'vinxi/http'

const setServerCookie = <T>(name: string, value: T) => {
  'use server'
  _setServerCookie(name, JSON.stringify(value))
}

const setCookie = <T>(name: string, value: T) => {
  if (isServer) {
    setServerCookie(name, value)
  } else {
    jsCookie.set(name, JSON.stringify(value))
  }
}

const getCookies = (): Record<string, string | undefined> => {
  if (isServer) {
    return parse(getRequestEvent()?.request.headers.get('cookie') ?? '')
  }

  return parse(document.cookie)
}

const getCookie = <T>(name: string, defaultValue: T): T => {
  const value = getCookies()[name]

  if (value === undefined) {
    return defaultValue
  }

  return JSON.parse(value)
}

export const useCookie = <T>(name: string, defaultValue: T): Signal<T> => {
  const [cookie, __setCookie] = createSignal<T>(getCookie(name, defaultValue))
  const updateCookie = (value: T) => {
    setCookie(name, value)
  }

  const _setCookie = (value: T | ((prev: T) => T)) => {
    __setCookie((prev) => {
      if (typeof value === 'function') {
        const newValue = (value as (prev: T) => T)(prev)

        updateCookie(newValue)

        return newValue
      }

      updateCookie(value)

      return value
    })
  }

  return [cookie, _setCookie as any]
}
