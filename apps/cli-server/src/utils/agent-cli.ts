import path from 'node:path'
import {isPathInsideDirectory} from './safe-path'

const RESUME_FLAG_PREFIX = '--resume='
const conversationSessionMap = new Map<string, string>()

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null

export const DEFAULT_AGENT_CLI = 'agent'
export const DEFAULT_AGENT_CLI_ARGS = [
  '-p',
  '--stream-partial-output',
  '--trust',
  '--output-format',
  'stream-json',
]

export const clearEmptyItems = (args: (string | undefined)[]): string[] =>
  args.filter((item): item is string => item !== undefined && item !== '')

export const hasExplicitSessionControl = (
  subcommand: string | undefined,
  args: readonly string[],
): boolean => {
  if (subcommand === 'resume') {
    return true
  }

  return args.some(
    (item) => item === '--continue' || item === '--resume' || item.startsWith(RESUME_FLAG_PREFIX),
  )
}

export const resolveCliWorkingDirectory = ({
  requestedDirectory,
  workspaceRoot,
}: {
  requestedDirectory: string | undefined
  workspaceRoot: string
}): string => {
  if (requestedDirectory === undefined || requestedDirectory === '/') {
    return path.resolve(workspaceRoot)
  }

  const resolvedDirectory = requestedDirectory.startsWith('/')
    ? path.resolve(workspaceRoot, `.${requestedDirectory}`)
    : path.resolve(workspaceRoot, requestedDirectory)

  if (
    !isPathInsideDirectory({
      directoryPath: workspaceRoot,
      targetPath: resolvedDirectory,
    })
  ) {
    throw new Error('Working directory must stay inside the workspace root.')
  }

  return resolvedDirectory
}

export const getPersistedSessionId = (conversationId: string | undefined): string | undefined => {
  if (conversationId === undefined) {
    return
  }

  return conversationSessionMap.get(conversationId)
}

export const setPersistedSessionId = ({
  conversationId,
  sessionId,
}: {
  conversationId: string
  sessionId: string
}): void => {
  conversationSessionMap.set(conversationId, sessionId)
}

export const buildResumeArgs = ({
  persistedSessionId,
  subcommand,
  args,
}: {
  persistedSessionId: string | undefined
  subcommand: string | undefined
  args: readonly string[]
}): string[] => {
  if (persistedSessionId === undefined || hasExplicitSessionControl(subcommand, args)) {
    return []
  }

  return [`${RESUME_FLAG_PREFIX}${persistedSessionId}`]
}

export const createSessionTracker = () => {
  let lineBuffer = ''
  let resolvedSessionId: string | undefined

  const onStdoutChunk = (chunk: string) => {
    lineBuffer += chunk.replaceAll('\r\n', '\n').replaceAll('\r', '\n')
    const lines = lineBuffer.split('\n')
    lineBuffer = lines.pop() ?? ''

    for (const line of lines) {
      const trimmed = line.trim()

      if (trimmed !== '') {
        try {
          const parsed = JSON.parse(trimmed) as unknown

          if (isRecord(parsed) && 'session_id' in parsed && typeof parsed.session_id === 'string') {
            resolvedSessionId = parsed.session_id

            return
          }
        } catch {
          // ignore non-JSON chunk
        }
      }
    }
  }

  return {
    getSessionId: () => resolvedSessionId,
    onStdoutChunk,
  }
}
