import {type IncomingMessage, type ServerResponse} from 'node:http'
import parse from '@polka/url'
import type {Module, OverrideHeaders} from './types'
import {DEFAULT_PREFIX, standardOverrideHeaders, standardUrlMapper} from './share'

export type SimpleHandleFunction = (
  req: IncomingMessage,
  res: ServerResponse,
  next: () => void,
) => void

export type GetModule = (url: string) => Promise<Module | null>

const OK = 200

export const MIDDLEWARE_NAME = 'viteCdnMiddleware'

const addProtocol = (url: string) => {
  if (/^\w+:\/\//u.test(url)) {
    return url
  }

  return `https://${url}`
}

export const createCdnMiddleware = (
  getModule: GetModule,
  overrideHeaders: OverrideHeaders = standardOverrideHeaders,
  sourceMap: Record<string, string> = {},
  prefix = DEFAULT_PREFIX,
): SimpleHandleFunction => {
  async function viteCdnMiddleware(req, res, next) {
    const {pathname} = parse(req)

    const actualUrl = standardUrlMapper(pathname, prefix)

    if (!actualUrl) {
      return next()
    }

    const sourceUrl = sourceMap[actualUrl] ?? addProtocol(actualUrl)

    const module = await getModule(sourceUrl)

    if (!module) {
      return next()
    }

    res.writeHead(OK, overrideHeaders(pathname, module.headers))
    res.end(module.text)
  }

  return viteCdnMiddleware
}
