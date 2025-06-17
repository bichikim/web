import type {Module, OverrideHeaders, URLMapper} from './types'
import fetch from 'node-fetch'

export const DEFAULT_PREFIX = '/_cdn/'

export const standardUrlMapper: URLMapper = (url: string, prefix = DEFAULT_PREFIX) => {
  const prefixLength = prefix.length

  if (url.startsWith(prefix)) {
    return url.slice(prefixLength)
  }

  return null
}

export const standardOverrideHeaders: OverrideHeaders = (_, headers) => {
  return headers
}

export const fetchModule = async (module: string): Promise<Module> => {
  const response = await fetch(module)

  return {
    headers: response.headers.raw(),
    text: await response.text(),
  }
}

export const createGetModule = () => {
  const modulesMap: Record<string, Module | null> = {}

  return async (url: string): Promise<Module | null> => {
    const module = modulesMap[url]

    if (module) {
      return module
    }

    try {
      const _module = await fetchModule(url)

      modulesMap[url] = _module

      return _module
    } catch {
      return null
    }
  }
}
