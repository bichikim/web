import type {APIEvent} from '@solidjs/start/server'
import {createError} from 'h3'
import {createIPX, createIPXWebServer, type IPXStorage} from 'ipx'
import {getSelfUrl} from 'src/env'
import {joinURL} from 'ufo'

interface SelfStorageOptions {
  selfUrl: string
}

const DEFAULT_MAX_AGE = 300
const IMAGE_API_PATH = '/api/img'
const IMAGE_STORAGE_PATH = 'images'
const ENCODED_BYTE_PATTERN = /%[\dA-F]{2}/iu
const MAX_PATH_DECODE_PASSES = 8
const HTTP_NOT_FOUND = 404
const HTTP_GONE = 410
const MISSING_RESOURCE_STATUSES = new Set([HTTP_NOT_FOUND, HTTP_GONE])

const decodePathname = (pathname: string) => {
  let decoded = pathname

  for (let pass = 0; pass < MAX_PATH_DECODE_PASSES; pass += 1) {
    if (!ENCODED_BYTE_PATTERN.test(decoded)) {
      return decoded
    }

    try {
      decoded = decodeURIComponent(decoded)
    } catch {
      return undefined
    }
  }

  return ENCODED_BYTE_PATTERN.test(decoded) ? undefined : decoded
}

const resolveStorageUrl = (options: SelfStorageOptions, id: string) => {
  const storageRoot = new URL(`${joinURL(options.selfUrl, IMAGE_STORAGE_PATH)}/`)
  const target = new URL(joinURL(storageRoot.href, id))
  const decodedPathname = decodePathname(target.pathname)

  if (decodedPathname === undefined) {
    return undefined
  }

  const decodedTarget = new URL(decodedPathname, target.origin)

  if (
    decodedTarget.origin !== storageRoot.origin ||
    !decodedTarget.pathname.startsWith(storageRoot.pathname)
  ) {
    return undefined
  }

  return target.href
}

const acceptUpstreamResponse = (response: Response) => {
  if (response.ok) {
    return response
  }

  if (MISSING_RESOURCE_STATUSES.has(response.status)) {
    return undefined
  }

  throw createError({
    message: `Image source request failed with status ${response.status}`,
    statusCode: response.status,
    statusMessage: response.statusText || undefined,
  })
}

function parseResponse(response: Response) {
  let maxAge = DEFAULT_MAX_AGE

  const _cacheControl = response.headers.get('cache-control')

  if (_cacheControl) {
    const m = _cacheControl.match(/max-age=(?<maxAge>\d+)/u)

    if (m?.groups?.maxAge) {
      maxAge = Number.parseInt(m.groups.maxAge, 10)
    }
  }

  let mtime
  const _lastModified = response.headers.get('last-modified')

  if (_lastModified) {
    mtime = new Date(_lastModified)
  }

  return {maxAge, mtime}
}

const createSelfStorage = (options: SelfStorageOptions): IPXStorage => {
  return {
    getData: async (id: string) => {
      const url = resolveStorageUrl(options, id)

      if (url === undefined) {
        return undefined
      }

      const response = acceptUpstreamResponse(await fetch(url))

      return response?.arrayBuffer()
    },
    getMeta: async (id: string) => {
      const url = resolveStorageUrl(options, id)

      if (url === undefined) {
        return undefined
      }

      const response = acceptUpstreamResponse(
        await fetch(url, {
          method: 'HEAD',
        }),
      )

      return response === undefined ? undefined : parseResponse(response)
    },
    name: 'ipx:self',
  }
}

const createImageRequest = (request: Request) => {
  const url = new URL(request.url)
  const imagePath = url.pathname.slice(IMAGE_API_PATH.length)

  url.pathname = imagePath || '/'

  return new Request(url, request)
}

const imageProcessor = createIPX({storage: createSelfStorage({selfUrl: getSelfUrl()})})
const handleImage = createIPXWebServer(imageProcessor)

export const GET = (event: APIEvent) => {
  return handleImage(createImageRequest(event.request))
}
