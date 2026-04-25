import type {ChatMessage} from '@/components/agent/AgentChatSection'
import type {AgentSessionSummary} from '@/components/agent/types'

const DEFAULT_POST_URL = 'http://localhost:3040/agent'
const AGENT_POST_URL_STORAGE_KEY = 'cli-client.agent-post-url'
const AGENT_WORKING_DIRECTORY_STORAGE_KEY = 'cli-client.agent-working-directory'
const LOCAL_HOST_PREFIX_PATTERN = /^(localhost|127\.0\.0\.1)(:\d+)?(\/.*)?$/i

export const DEFAULT_WORKING_DIRECTORY = '/'

const resolvePostUrl = () => import.meta.env.VITE_AGENT_POST_URL ?? DEFAULT_POST_URL
const normalizePostUrl = (value: string) => value.trim()

export const loadInitialPostUrl = (): string => {
  const fallback = resolvePostUrl()

  if (typeof window === 'undefined') {
    return fallback
  }

  try {
    const stored = window.localStorage.getItem(AGENT_POST_URL_STORAGE_KEY)

    if (stored === null) {
      return fallback
    }

    const normalized = normalizePostUrl(stored)

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

const isAbsoluteHttpUrl = (value: string): boolean => {
  try {
    const parsed = new URL(value)

    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const resolveRequestUrl = (input: string): {url: string} | {error: string} => {
  const normalized = normalizePostUrl(input)

  if (normalized.length === 0) {
    return {url: resolvePostUrl()}
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

const resolveSessionHistoryRequestUrl = (
  input: string,
  sessionId: string,
): {url: string} | {error: string} => {
  const resolved = resolveRequestUrl(input)

  if ('error' in resolved) {
    return resolved
  }

  try {
    const parsed = new URL(resolved.url)
    const normalizedPath = parsed.pathname.endsWith('/')
      ? parsed.pathname.slice(0, Math.max(1, parsed.pathname.length - 1))
      : parsed.pathname
    const base = normalizedPath.endsWith('/agent') ? normalizedPath : '/agent'

    parsed.pathname = `${base}/sessions/${encodeURIComponent(sessionId)}/history`
    parsed.search = ''
    parsed.hash = ''

    return {url: parsed.toString()}
  } catch {
    if (resolved.url.startsWith('/')) {
      const normalizedPath = resolved.url.endsWith('/')
        ? resolved.url.slice(0, Math.max(1, resolved.url.length - 1))
        : resolved.url
      const base = normalizedPath.endsWith('/agent') ? normalizedPath : '/agent'

      return {url: `${base}/sessions/${encodeURIComponent(sessionId)}/history`}
    }

    return {
      error: '세션 기록 API 주소를 계산하지 못했습니다. 설정에서 요청 API 주소를 확인해 주세요.',
    }
  }
}

const resolveSessionsRequestUrl = (input: string): {url: string} | {error: string} => {
  const resolved = resolveRequestUrl(input)
  if ('error' in resolved) {
    return resolved
  }

  try {
    const parsed = new URL(resolved.url)
    const normalizedPath = parsed.pathname.endsWith('/')
      ? parsed.pathname.slice(0, Math.max(1, parsed.pathname.length - 1))
      : parsed.pathname
    const sessionPath = normalizedPath.endsWith('/agent')
      ? `${normalizedPath}/sessions`
      : '/agent/sessions'

    parsed.pathname = sessionPath
    parsed.search = ''
    parsed.hash = ''

    return {url: parsed.toString()}
  } catch {
    if (resolved.url.startsWith('/')) {
      const normalizedPath = resolved.url.endsWith('/')
        ? resolved.url.slice(0, Math.max(1, resolved.url.length - 1))
        : resolved.url
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

export const parseHttpErrorBody = async (response: Response): Promise<string> => {
  const text = await response.text()

  try {
    const parsed = JSON.parse(text) as {error?: unknown}

    if (typeof parsed.error === 'string') {
      return parsed.error
    }
  } catch {
    // ignore JSON parse failure
  }

  return text.length > 0 ? text : `HTTP ${String(response.status)}`
}

export const fetchSessions = async ({
  postUrl,
  workingDirectory,
}: {
  postUrl: string
  workingDirectory: string
}): Promise<{sessions: readonly AgentSessionSummary[]} | {error: string}> => {
  const resolved = resolveSessionsRequestUrl(postUrl)

  if ('error' in resolved) {
    return {error: resolved.error}
  }

  try {
    const normalizedWorkingDirectory = workingDirectory.trim()
    const sessionsListUrl = `${resolved.url}?${new URLSearchParams({
      workingDirectory:
        normalizedWorkingDirectory.length > 0
          ? normalizedWorkingDirectory
          : DEFAULT_WORKING_DIRECTORY,
    }).toString()}`
    const response = await fetch(sessionsListUrl, {headers: {Accept: 'application/json'}})

    if (!response.ok) {
      return {error: await parseHttpErrorBody(response)}
    }

    const body = (await response.json()) as {sessions?: unknown}
    const sessions = Array.isArray(body.sessions)
      ? body.sessions.filter((item): item is AgentSessionSummary => {
          if (typeof item !== 'object' || item === null) {
            return false
          }

          const candidate = item as Partial<AgentSessionSummary>
          return (
            typeof candidate.conversationId === 'string' &&
            typeof candidate.sessionId === 'string' &&
            typeof candidate.title === 'string' &&
            (candidate.cwd === null || typeof candidate.cwd === 'string') &&
            typeof candidate.updatedAt === 'string'
          )
        })
      : []

    return {sessions}
  } catch (error) {
    return {error: error instanceof Error ? error.message : String(error)}
  }
}

const isHistoryMessageRow = (
  value: unknown,
): value is {id: string; role: 'user' | 'assistant'; content: string} => {
  if (typeof value !== 'object' || value === null) {
    return false
  }

  const row = value as {id?: unknown; role?: unknown; content?: unknown}

  return (
    typeof row.id === 'string' &&
    (row.role === 'user' || row.role === 'assistant') &&
    typeof row.content === 'string'
  )
}

export const fetchSessionHistory = async ({
  postUrl,
  workingDirectory,
  sessionId,
}: {
  postUrl: string
  workingDirectory: string
  sessionId: string
}): Promise<{messages: ChatMessage[]} | {error: string}> => {
  const resolved = resolveSessionHistoryRequestUrl(postUrl, sessionId)

  if ('error' in resolved) {
    return {error: resolved.error}
  }

  try {
    const normalizedWorkingDirectory = workingDirectory.trim()
    const historyUrl = `${resolved.url}?${new URLSearchParams({
      workingDirectory:
        normalizedWorkingDirectory.length > 0
          ? normalizedWorkingDirectory
          : DEFAULT_WORKING_DIRECTORY,
    }).toString()}`
    const response = await fetch(historyUrl, {headers: {Accept: 'application/json'}})

    if (!response.ok) {
      return {error: await parseHttpErrorBody(response)}
    }

    const body = (await response.json()) as {messages?: unknown}
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isHistoryMessageRow).map(
          (row): ChatMessage => ({
            id: row.id,
            role: row.role,
            content: row.content,
          }),
        )
      : []

    return {messages}
  } catch (error) {
    return {error: error instanceof Error ? error.message : String(error)}
  }
}
