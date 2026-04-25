import {DEFAULT_WORKING_DIRECTORY, readConfiguredAgentPostUrl} from '@/utils/agent-defaults'

const AGENT_POST_URL_STORAGE_KEY = 'cli-client.agent-post-url'
const AGENT_WORKING_DIRECTORY_STORAGE_KEY = 'cli-client.agent-working-directory'

export const loadInitialPostUrl = (): string => {
  const fallback = readConfiguredAgentPostUrl()

  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const stored = window.localStorage.getItem(AGENT_POST_URL_STORAGE_KEY)

    if (stored === null) {
      return fallback
    }

    const normalized = stored.trim()

    return normalized.length > 0 ? normalized : fallback
  } catch {
    return fallback
  }
}

export const loadInitialWorkingDirectory = (): string => {
  if (typeof window === 'undefined') {
    return DEFAULT_WORKING_DIRECTORY
  }

  try {
    const stored = window.localStorage.getItem(AGENT_WORKING_DIRECTORY_STORAGE_KEY)

    if (stored === null) {
      return DEFAULT_WORKING_DIRECTORY
    }

    const normalized = stored.trim()

    return normalized.length > 0 ? normalized : DEFAULT_WORKING_DIRECTORY
  } catch {
    return DEFAULT_WORKING_DIRECTORY
  }
}

export const persistPostUrl = (value: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(AGENT_POST_URL_STORAGE_KEY, value)
  } catch {
    // ignore storage failure
  }
}

export const persistWorkingDirectory = (value: string): void => {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(AGENT_WORKING_DIRECTORY_STORAGE_KEY, value)
  } catch {
    // ignore storage failure
  }
}
