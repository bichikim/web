import jsCookie from 'js-cookie'
import {CookieSerializeOptions} from 'cookie-es'
import {getCookie as _getServerCookie, setCookie as _setServerCookie} from '@solidjs/start/http'

const normalizeSameSite = (
  sameSite: CookieSerializeOptions['sameSite'],
): Cookies.CookieAttributes['sameSite'] => {
  if (sameSite === true) {
    return 'strict'
  }

  if (sameSite === false) {
    return 'none'
  }

  return sameSite
}

export const setClientCookie = (name: string, value: string, options?: CookieSerializeOptions) => {
  jsCookie.set(name, value, {
    domain: options?.domain,
    expires: options?.expires,
    httpOnly: options?.httpOnly,
    maxAge: options?.maxAge,
    path: options?.path,
    priority: options?.priority,
    sameSite: normalizeSameSite(options?.sameSite),
    secure: options?.secure,
  })
}

export const getClientCookie = (name: string) => {
  return jsCookie.get(name)
}

export const setServerCookie = (name: string, value: string, options?: CookieSerializeOptions) => {
  'use server'
  _setServerCookie(name, value, options)
}

export const getServerCookie = (name: string) => {
  'use server'

  return _getServerCookie(name)
}
