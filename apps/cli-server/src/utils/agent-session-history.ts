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
    .replace(/<[^>]+>/gu, ' ')
    .replaceAll(/\s+/gu, ' ')
    .trim()

// Cursor가 transcript에 남기는 민감/내부 구간 마커(원문은 저장하지 않음)
const stripRedactedMarkers = (value: string): string =>
  value
    .replace(/\s*\[REDACTED\]\s*/gu, ' ')
    .replace(/\s{2,}/gu, ' ')
    .trim()

const extractTextFromMessagePayload = (message: unknown): string => {
  if (!isRecord(message)) {
    return ''
  }

  const {content} = message

  if (!Array.isArray(content)) {
    return ''
  }

  const parts: string[] = []

  for (const item of content) {
    if (isRecord(item) && item.type === 'text' && typeof item.text === 'string') {
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
}

const collectMessageIfValid = ({
  collected,
  lineIndex,
  parsed,
  sessionId,
}: {
  collected: AgentHistoryChatMessage[]
  lineIndex: number
  parsed: unknown
  sessionId: string
}): void => {
  if (!isRecord(parsed)) {
    return
  }

  const role = resolveChatRole(parsed)
  if (role === undefined) {
    return
  }

  const messagePayload = parsed.message
  const content = extractTextFromMessagePayload(messagePayload)
  if (content === '') {
    return
  }

  collected.push({
    content,
    id: `${sessionId}-${String(lineIndex)}`,
    role,
  })
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
    sessionId,
    workingDirectory,
    workspaceRoot,
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
    } else {
      try {
        const parsed = JSON.parse(trimmedLine) as unknown
        collectMessageIfValid({collected, lineIndex, parsed, sessionId})
      } catch {
        // ignore malformed line
      }

      lineIndex += 1
    }
  }

  return collected
}
