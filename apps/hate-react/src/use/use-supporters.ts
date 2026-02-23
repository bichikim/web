import {createResource} from 'solid-js'
import {getApiBaseUrl} from 'src/env'

export interface SupportersResource {
  error?: Error
  messages: string[]
}

const fetchSupporters = async (): Promise<string[]> => {
  const base = getApiBaseUrl()
  const response = await fetch(`${base}/api/supporters`)

  if (!response.ok) {
    throw new Error(`Failed to fetch supporters: ${response.status}`)
  }
  const data = (await response.json()) as {messages: string[]}

  return data.messages ?? []
}

/**
 * Fetches supporter messages from /api/supporters
 */
export const useSupporters = () => {
  const [supporters] = createResource(fetchSupporters)

  return supporters
}
