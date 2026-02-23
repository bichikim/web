import {getRequestEvent} from 'solid-js/web'

export const getBmcAccessToken = (): string | undefined => process.env.BUYMEACOFFEE_ACCESS_TOKEN

export const getBmcUsername = (): string | undefined => process.env.BUYMEACOFFEE_USERNAME

const DEFAULT_PORT = 3000

/**
 * Get absolute URL for API requests (required for SSR fetch)
 */
export const getApiBaseUrl = (): string => {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  const event = getRequestEvent?.()

  if (event?.request?.url) {
    return new URL(event.request.url).origin
  }
  const port = process.env.PORT ?? DEFAULT_PORT

  return `http://localhost:${port}`
}
