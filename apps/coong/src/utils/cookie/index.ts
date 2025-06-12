import {isServer} from 'solid-js/web'
import jsCookie, {CookieAttributes} from 'js-cookie'
import {
  CookieSerializeOptions,
  deleteCookie as deleteServerCookie,
  getCookie as getServerCookie,
  setCookie as setServerCookie,
} from 'vinxi/http'

/**
 * Convert the options to the js-cookie format
 * @param options - The options for the cookie
 * @returns The options in the js-cookie format
 */
const getJsCookieOptions = (options?: CookieSerializeOptions) => {
  const {expires, domain, path, secure, sameSite, maxAge, partitioned, priority} = options ?? {}

  return {
    domain,
    expires,
    maxAge,
    partitioned,
    path,
    priority,
    sameSite: jsSameSite(sameSite),
    secure,
  }
}

/**
 * Convert the sameSite option to the js-cookie format
 * @param sameSite - The sameSite option
 * @returns The sameSite option in the js-cookie format
 */
const jsSameSite = (sameSite: CookieSerializeOptions['sameSite']): CookieAttributes['sameSite'] => {
  if (sameSite === true) {
    return 'strict'
  }

  if (sameSite === false) {
    return undefined
  }

  return sameSite
}

/**
 * Set a cookie
 * @param name - The name of the cookie
 * @param value - The value of the cookie
 * @param options - The options for the cookie
 */
export const setCookie = (name: string, value: string, options?: CookieSerializeOptions) => {
  if (isServer) {
    setServerCookie(name, value, options)
  } else {
    jsCookie.set(name, value, getJsCookieOptions(options))
  }
}

/**
 * Delete a cookie
 * @param name - The name of the cookie
 * @param options - The options for the cookie
 */
export const deleteCookie = (name: string, options?: CookieSerializeOptions) => {
  if (isServer) {
    deleteServerCookie(name, options)
  } else {
    jsCookie.remove(name, getJsCookieOptions(options))
  }
}

/**
 * Get a cookie value
 * @param name - The name of the cookie
 * @returns The value of the cookie
 */
export const getCookie = (name: string) => {
  if (isServer) {
    return getServerCookie(name)
  }

  return jsCookie.get(name)
}
