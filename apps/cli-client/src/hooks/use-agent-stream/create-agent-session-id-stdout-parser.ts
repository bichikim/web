const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

const tryParseSessionIdLine = (
  line: string,
  setSessionId: (sessionId: string) => void,
): boolean => {
  const trimmedLine = line.trim()

  if (trimmedLine === '') {
    return false
  }

  try {
    const parsed = JSON.parse(trimmedLine) as unknown

    if (!isRecord(parsed)) {
      return false
    }

    if ('session_id' in parsed && typeof parsed.session_id === 'string') {
      setSessionId(parsed.session_id)
      return true
    }
  } catch {
    // ignore non-JSON chunk
  }

  return false
}

export interface AgentSessionIdStdoutParser {
  readonly onStdoutChunk: (chunk: string) => void
  readonly flush: () => void
}

export const createAgentSessionIdStdoutParser = (
  setSessionId: (sessionId: string) => void,
): AgentSessionIdStdoutParser => {
  let buffer = ''

  return {
    onStdoutChunk(chunk: string) {
      buffer += chunk.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (tryParseSessionIdLine(line, setSessionId)) {
          return
        }
      }
    },
    flush() {
      if (tryParseSessionIdLine(buffer, setSessionId)) {
        return
      }

      buffer = ''
    },
  }
}
