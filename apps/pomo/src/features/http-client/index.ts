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

const createResponseFetch = (fetchInstance: $Fetch): typeof fetch =>
  async function responseFetch(input, init) {
    const {body, ...options} = init ?? {}
    const request = input instanceof URL ? input.href : input

    try {
      return await fetchInstance.raw(request, {
        ...options,
        body: body ?? undefined,
        responseType: 'stream',
        retry: isRetryableMethod(getMethod(input, init)) ? RETRY_COUNT : 0,
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

const sharedFetch = ofetch.create({
  retryDelay: RETRY_DELAY_MILLISECONDS,
  retryStatusCodes: RETRY_STATUS_CODES,
})

export const httpFetch = createResponseFetch(sharedFetch)

const apiBaseURL = import.meta.env.POMO_IS_APPS_IN_TOSS
  ? new URL('/api/', import.meta.env.POMO_PUBLIC_ORIGIN).href
  : '/api/'

export const apiFetch = createResponseFetch(sharedFetch.create({baseURL: apiBaseURL}))

export const audioFetch = createResponseFetch(sharedFetch.create({baseURL: '/audio/'}))
