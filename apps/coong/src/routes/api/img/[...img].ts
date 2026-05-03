import {APIEvent} from '@solidjs/start/server'
import {createIPX, createIPXH3App} from 'ipx'
import {toWebHandler} from 'h3'
import {getSelfUrl} from 'src/env'
import {joinURL} from 'ufo'

interface IPXSelfStorageOptions {
  /**
   * @default 300
   */
  defaultMaxAge?: number
  /**
   * @default false
   */
  ignoreCacheControl?: boolean
  /**
   * @default 'images'
   */
  path?: string
  selfUrl: string
}

const DEFAULT_MAX_AGE = 300

function parseResponse(
  response: Response,
  options: Pick<IPXSelfStorageOptions, 'defaultMaxAge' | 'ignoreCacheControl'> = {},
) {
  const {defaultMaxAge = DEFAULT_MAX_AGE, ignoreCacheControl = false} = options

  let maxAge = defaultMaxAge

  if (ignoreCacheControl !== true) {
    const _cacheControl = response.headers.get('cache-control')

    if (_cacheControl) {
      const m = _cacheControl.match(/max-age=(?<maxAge>\d+)/u)

      if (m?.groups?.maxAge) {
        maxAge = Number.parseInt(m.groups.maxAge, 10)
      }
    }
  }

  let mtime
  const _lastModified = response.headers.get('last-modified')

  if (_lastModified) {
    mtime = new Date(_lastModified)
  }

  return {maxAge, mtime}
}

const selfStorage = (options: IPXSelfStorageOptions) => {
  const {selfUrl, path = 'images'} = options

  return {
    getData: async (id: string) => {
      return fetch(joinURL(selfUrl, path, id)).then((res) => res.arrayBuffer())
    },
    getMeta: async (id: string) => {
      const response = await fetch(joinURL(selfUrl, path, id), {
        method: 'HEAD',
      })

      return parseResponse(response, options)
    },
    name: 'ipx:self',
  }
}

const ipx = createIPX({
  storage: selfStorage({selfUrl: getSelfUrl()}),
})

const handler = toWebHandler(createIPXH3App(ipx))

export const GET = (event: APIEvent) => {
  const parts = event.request.url.split(`${event.request.headers.get('host')}/api/img`)

  return handler(new Request(joinURL(parts[0], event.request.headers.get('host') ?? '', parts[1])))
}
