import jsCookie from 'js-cookie'
import {setCookie as setServerCookie, getCookie as getServerCookie} from 'vinxi/http'
import {CookieSerializeOptions} from 'cookie-es'

const normalizeSameSite = (sameSite: CookieSerializeOptions['sameSite']): Cookies.CookieAttributes['sameSite'] => {
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

export {setServerCookie, getServerCookie}
