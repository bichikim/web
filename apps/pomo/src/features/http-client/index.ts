import {usesRemotePublicOrigin} from './runtime-origin'
export * from './parse-retry-after-seconds'
export * from './runtime-origin'
import {type $Fetch, FetchError, ofetch} from 'ofetch'

const RETRY_DELAY_MILLISECONDS = 250
const RETRY_COUNT = 1
const HTTP_REQUEST_TIMEOUT = 408
const HTTP_TOO_EARLY = 425
const HTTP_TOO_MANY_REQUESTS = 429
const HTTP_INTERNAL_SERVER_ERROR = 500
const HTTP_BAD_GATEWAY = 502
const HTTP_SERVICE_UNAVAILABLE = 503
const HTTP_GATEWAY_TIMEOUT = 504
const RETRY_STATUS_CODES = [
  HTTP_REQUEST_TIMEOUT,
  HTTP_TOO_EARLY,
  HTTP_TOO_MANY_REQUESTS,
  HTTP_INTERNAL_SERVER_ERROR,
  HTTP_BAD_GATEWAY,
  HTTP_SERVICE_UNAVAILABLE,
  HTTP_GATEWAY_TIMEOUT,
]
const getMethod = (input: RequestInfo | URL, init?: RequestInit) =>
  (init?.method ?? (input instanceof Request ? input.method : 'GET')).toUpperCase()

const isRetryableMethod = (method: string) => method === 'GET' || method === 'HEAD'

export interface HttpRequestInit extends RequestInit {
  readonly retry?: false
}
export interface HttpFetch {
  (input: RequestInfo | URL, init?: HttpRequestInit): Promise<Response>
}

const createResponseFetch = (fetchInstance: $Fetch): HttpFetch =>
  async function responseFetch(input, init) {
    const {body, ...options} = init ?? {}
    const request = input instanceof URL ? input.href : input

    try {
      return await fetchInstance.raw(request, {
        ...options,
        body: body ?? undefined,
        responseType: 'stream',
        retry: init?.retry !== false && isRetryableMethod(getMethod(input, init)) ? RETRY_COUNT : 0,
      })
    } catch (error: unknown) {
      if (error instanceof FetchError) {
        if (error.response !== undefined) {
          return error.response
        }

        if (error.cause !== undefined) {
          throw error.cause
        }
      }

      throw error
    }
  }

const usesBundledProductAssets = import.meta.env.VITE_POMO_DISTRIBUTION_TARGET === 'steam'
const publicBaseURL = usesRemotePublicOrigin() ? import.meta.env.VITE_POMO_PUBLIC_ORIGIN : undefined
const sharedFetch = ofetch.create({
  baseURL: publicBaseURL,
  retryDelay: RETRY_DELAY_MILLISECONDS,
  retryStatusCodes: RETRY_STATUS_CODES,
})

export const httpFetch = createResponseFetch(sharedFetch)

const apiBaseURL = usesRemotePublicOrigin()
  ? new URL('/api/', import.meta.env.VITE_POMO_PUBLIC_ORIGIN).href
  : '/api/'

export const apiFetch = createResponseFetch(sharedFetch.create({baseURL: apiBaseURL}))

const audioBaseURL = usesBundledProductAssets
  ? '/audio/'
  : usesRemotePublicOrigin()
    ? new URL('/audio/', import.meta.env.VITE_POMO_PUBLIC_ORIGIN).href
    : '/audio/'

export const audioFetch = createResponseFetch(sharedFetch.create({baseURL: audioBaseURL}))
