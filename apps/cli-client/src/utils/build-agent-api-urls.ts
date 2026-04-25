import {normalizeAgentApiBasePath} from '@/utils/agent-url-path-helpers'
import {resolveRequestUrl} from '@/utils/resolve-request-url'

export const resolveSessionHistoryRequestUrl = (
  input: string,
  sessionId: string,
): {url: string} | {error: string} => {
  const resolved = resolveRequestUrl(input)

  if ('error' in resolved) {
    return resolved
  }

  try {
    const parsed = new URL(resolved.url)
    const base = normalizeAgentApiBasePath(parsed.pathname)

    parsed.pathname = `${base}/sessions/${encodeURIComponent(sessionId)}/history`
    parsed.search = ''
    parsed.hash = ''

    return {url: parsed.toString()}
  } catch {
    if (resolved.url.startsWith('/')) {
      const base = normalizeAgentApiBasePath(resolved.url)

      return {url: `${base}/sessions/${encodeURIComponent(sessionId)}/history`}
    }

    return {
      error: '세션 기록 API 주소를 계산하지 못했습니다. 설정에서 요청 API 주소를 확인해 주세요.',
    }
  }
}

export const resolveSessionsRequestUrl = (input: string): {url: string} | {error: string} => {
  const resolved = resolveRequestUrl(input)

  if ('error' in resolved) {
    return resolved
  }

  try {
    const parsed = new URL(resolved.url)
    const normalizedPath = normalizeAgentApiBasePath(parsed.pathname)
    const sessionPath = normalizedPath.endsWith('/agent')
      ? `${normalizedPath}/sessions`
      : '/agent/sessions'

    parsed.pathname = sessionPath
    parsed.search = ''
    parsed.hash = ''

    return {url: parsed.toString()}
  } catch {
    if (resolved.url.startsWith('/')) {
      const normalizedPath = normalizeAgentApiBasePath(resolved.url)
      const sessionPath = normalizedPath.endsWith('/agent')
        ? `${normalizedPath}/sessions`
        : '/agent/sessions'

      return {url: sessionPath}
    }

    return {
      error: '세션 목록 API 주소를 계산하지 못했습니다. 설정에서 요청 API 주소를 확인해 주세요.',
    }
  }
}
