import type {ChatMessage} from '@/components/agent/AgentChatSection'
import type {AgentSessionSummary} from '@/components/agent/types'
import {appendWorkingDirectoryQuery} from '@/utils/append-working-directory-query'
import {
  resolveSessionHistoryRequestUrl,
  resolveSessionsRequestUrl,
} from '@/utils/build-agent-api-urls'
import {parseHttpErrorBody} from '@/utils/parse-http-error-body'

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
    const sessionsListUrl = appendWorkingDirectoryQuery(resolved.url, workingDirectory)
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
    const historyUrl = appendWorkingDirectoryQuery(resolved.url, workingDirectory)
    const response = await fetch(historyUrl, {headers: {Accept: 'application/json'}})

    if (!response.ok) {
      return {error: await parseHttpErrorBody(response)}
    }

    const body = (await response.json()) as {messages?: unknown}
    const messages = Array.isArray(body.messages)
      ? body.messages.filter(isHistoryMessageRow).map(
          (row): ChatMessage => ({
            content: row.content,
            id: row.id,
            role: row.role,
          }),
        )
      : []

    return {messages}
  } catch (error) {
    return {error: error instanceof Error ? error.message : String(error)}
  }
}
