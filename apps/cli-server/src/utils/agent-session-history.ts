import fs from 'node:fs/promises'
import {resolveAgentSessionJsonlFilePath} from './agent-sessions'

export interface AgentHistoryChatMessage {
  readonly id: string
  readonly role: 'user' | 'assistant'
  readonly content: string
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const normalizeLineBreaks = (value: string): string =>
  value.replaceAll('\r\n', '\n').replaceAll('\r', '\n')

const stripWrapperTags = (value: string): string =>
  value
    .replace(/<[^>]+>/g, ' ')
    .replaceAll(/\s+/g, ' ')
    .trim()

// Cursor가 transcript에 남기는 민감/내부 구간 마커(원문은 저장하지 않음)
const stripRedactedMarkers = (value: string): string =>
  value
    .replace(/\s*\[REDACTED\]\s*/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .trim()

const extractTextFromMessagePayload = (message: unknown): string => {
  if (!isRecord(message)) {
    return ''
  }

  const content = message.content

  if (!Array.isArray(content)) {
    return ''
  }

  const parts: string[] = []

  for (const item of content) {
    if (!isRecord(item)) {
      continue
    }

    if (item.type === 'text' && typeof item.text === 'string') {
      parts.push(item.text)
    }
  }

  return stripWrapperTags(stripRedactedMarkers(parts.join('\n')))
}

const resolveChatRole = (event: Record<string, unknown>): 'user' | 'assistant' | undefined => {
  if (event.role === 'user' || event.role === 'assistant') {
    return event.role
  }

  if (event.type === 'user') {
    return 'user'
  }

  if (event.type === 'assistant') {
    return 'assistant'
  }

  return
}

export const readAgentSessionHistory = async ({
  workspaceRoot,
  workingDirectory,
  sessionId,
}: {
  workspaceRoot: string
  workingDirectory: string
  sessionId: string
}): Promise<readonly AgentHistoryChatMessage[]> => {
  const filePath = await resolveAgentSessionJsonlFilePath({
    workspaceRoot,
    workingDirectory,
    sessionId,
  })

  if (filePath === undefined) {
    return []
  }

  const fileContent = await fs.readFile(filePath, 'utf8')
  const lines = normalizeLineBreaks(fileContent).split('\n')
  const collected: AgentHistoryChatMessage[] = []
  let lineIndex = 0

  for (const line of lines) {
    const trimmedLine = line.trim()

    if (trimmedLine === '') {
      lineIndex += 1
      continue
    }

    try {
      const parsed = JSON.parse(trimmedLine) as unknown

      if (!isRecord(parsed)) {
        lineIndex += 1
        continue
      }

      const role = resolveChatRole(parsed)

      if (role === undefined) {
        lineIndex += 1
        continue
      }

      const messagePayload = parsed.message
      const content = extractTextFromMessagePayload(messagePayload)

      if (content === '') {
        lineIndex += 1
        continue
      }

      collected.push({
        id: `${sessionId}-${String(lineIndex)}`,
        role,
        content,
      })
    } catch {
      // ignore malformed line
    }

    lineIndex += 1
  }

  return collected
}
