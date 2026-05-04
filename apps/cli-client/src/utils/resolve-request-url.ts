import {readConfiguredAgentPostUrl} from '@/utils/agent-defaults'

const LOCAL_HOST_PREFIX_PATTERN = /^(?:localhost|127\.0\.0\.1)(?::\d+)?(?:\/.*)?$/iu

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const resolveRequestUrl = (input: string): {url: string} | {error: string} => {
  const normalized = input.trim()

  if (normalized.length === 0) {
    return {url: readConfiguredAgentPostUrl()}
  }

  if (isAbsoluteHttpUrl(normalized)) {
    return {url: normalized}
  }

  if (LOCAL_HOST_PREFIX_PATTERN.test(normalized)) {
    return {url: `http://${normalized}`}
  }

  if (normalized.startsWith('/')) {
    return {url: normalized}
  }

  return {
    error:
      '요청 API 주소 형식이 올바르지 않습니다. 예: https://api.example.com/agent 또는 localhost:3040/agent',
  }
}
