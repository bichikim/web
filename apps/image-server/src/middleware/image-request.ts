import {got} from 'got'
import {RequestHandler} from 'express'
import {createProvideContext} from '../utils/context'
import {joinURL} from 'ufo'
import {
  assertPublicHttpUrl,
  DEFAULT_MAX_IMAGE_BYTES,
  ImageRequestError,
  safeDnsLookup,
} from './safe-image-request'

const HTTP_STATUS_CONTENT_TOO_LARGE = 413

export const imageContext = createProvideContext<Buffer>()

// export const useImage = imageContext.use

export interface ImageRequestOptions {
  defaultUrl?: string
  maxImageBytes?: number
}

const unwrapImageRequestError = (error: unknown): unknown => {
  let current = error

  while (current instanceof Error && 'cause' in current && current.cause) {
    if (current instanceof ImageRequestError) {
      return current
    }

    current = current.cause
  }

  return current instanceof ImageRequestError ? current : error
}

export const imageRequest = (options: ImageRequestOptions = {}): RequestHandler => {
  const {defaultUrl, maxImageBytes = DEFAULT_MAX_IMAGE_BYTES} = options

  return async (req, _, next) => {
    const requestUrl = req.url
    const {url} = req.query

    const targetUrl = url ?? (defaultUrl ? joinURL(defaultUrl, requestUrl) : undefined)

    if (!targetUrl) {
      return next()
    }

    try {
      const safeUrl = assertPublicHttpUrl(String(targetUrl))
      const request = got.stream(safeUrl, {
        dnsLookup: safeDnsLookup,
        hooks: {
          beforeRedirect: [
            ({url}) => {
              assertPublicHttpUrl(url as URL)
            },
          ],
        },
        maxRedirects: 3,
        retry: {limit: 0},
        timeout: {request: 10_000},
      })
      const chunks: Buffer[] = []
      let totalBytes = 0

      for await (const chunk of request) {
        const buffer = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)
        totalBytes += buffer.length

        if (totalBytes > maxImageBytes) {
          request.destroy()
          throw new ImageRequestError('Image response is too large', HTTP_STATUS_CONTENT_TOO_LARGE)
        }

        chunks.push(buffer)
      }

      imageContext.provide(req, Buffer.concat(chunks, totalBytes))
      next()
    } catch (error) {
      next(unwrapImageRequestError(error))
    }
  }
}
