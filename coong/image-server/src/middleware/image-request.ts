import got from 'got'
import {RequestHandler} from 'express'
import {createProvideContext} from '../utils/context'
import {resolveUrl} from '@winter-love/utils'

const imageContext = createProvideContext<Buffer>()

export const useImage = imageContext.use

export interface ImageRequestOptions {
  defaultUrl?: string
}

export const imageRequest = (options: ImageRequestOptions = {}): RequestHandler => {
  const {defaultUrl} = options
  return async (req, res, next) => {
    const requestUrl = req.url
    const {url} = req.query

    const targetUrl = url ?? (defaultUrl ? resolveUrl(defaultUrl, requestUrl) : undefined)

    if (!targetUrl) {
      return next()
    }
    const {body} = await got.get(String(targetUrl), {
      responseType: 'buffer',
    })

    imageContext.provide(req, body)

    next()
  }
}