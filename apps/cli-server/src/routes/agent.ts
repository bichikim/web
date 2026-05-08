import {sValidator} from '@hono/standard-validator'
import {execa} from 'execa'
import {env} from 'hono/adapter'
import {type Context, Hono} from 'hono'
import {streamSSE} from 'hono/streaming'
import * as z from 'zod'
import type {AppEnv} from '../app-env'
import {
  buildResumeArgs,
  clearEmptyItems,
  createSessionTracker,
  DEFAULT_AGENT_CLI,
  DEFAULT_AGENT_CLI_ARGS,
  getPersistedSessionId,
  resolveCliWorkingDirectory,
  setPersistedSessionId,
} from '../utils/agent-cli'
import {readAgentSessionHistory} from '../utils/agent-session-history'
import {
  listSessionsByWorkingDirectory,
  resolveAgentSessionJsonlFilePath,
} from '../utils/agent-sessions'
import {forwardStreamsToSse} from '../utilis/forward-streams-to-sse'

const HTTP_STATUS_INTERNAL_SERVER_ERROR = 500
const HTTP_STATUS_BAD_REQUEST = 400
const HTTP_STATUS_NOT_FOUND = 404

const toBadWorkingDirectoryResponse = (context: Context, error: unknown) => {
  if (error instanceof RangeError) {
    return context.json({error: error.message}, HTTP_STATUS_BAD_REQUEST)
  }

  throw error
}

/** `POST /agent` — body: `{ "prompt": string, "conversationId"?: string, "workingDirectory"?: string, "resumeSessionId"?: string, "subcommand"?: string, "args"?: string[] }`, 응답: `text/event-stream` (SSE). */
export const agentRoute = new Hono()

const agentPostBodySchema = z.object({
  args: z.array(z.string()).optional(),
  conversationId: z.preprocess((value) => {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value !== 'string') {
      return value
    }

    const trimmed = value.trim()

    if (trimmed === '') {
      return
    }

    return trimmed
  }, z.string().min(1).optional()),
  prompt: z.string().trim().min(1, '`prompt` field is required (non-empty string).'),
  resumeSessionId: z.preprocess((value) => {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value !== 'string') {
      return value
    }

    const trimmed = value.trim()

    if (trimmed === '') {
      return
    }

    return trimmed
  }, z.string().min(1).optional()),
  subcommand: z.preprocess((value) => {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value !== 'string') {
      return value
    }

    const trimmed = value.trim()

    if (trimmed === '') {
      return
    }

    return trimmed
  }, z.string().min(1).optional()),
  workingDirectory: z.preprocess((value) => {
    if (value === undefined || value === null) {
      return
    }

    if (typeof value !== 'string') {
      return value
    }

    const trimmed = value.trim()

    if (trimmed === '') {
      return
    }

    return trimmed
  }, z.string().min(1).optional()),
})

agentRoute.post('/', sValidator('json', agentPostBodySchema), async (context) => {
  const {
    prompt,
    conversationId,
    workingDirectory,
    subcommand,
    args = [],
    resumeSessionId,
  } = context.req.valid('json')

  const agentEnv = env<AppEnv>(context)
  const cli = agentEnv.AGENT_CLI ?? DEFAULT_AGENT_CLI
  const workspaceRoot = agentEnv.AGENT_WORKSPACE_ROOT

  if (workspaceRoot === undefined || workspaceRoot.trim() === '') {
    throw new Error('AGENT_WORKSPACE_ROOT is required.')
  }
  let cliWorkingDirectory: string

  try {
    cliWorkingDirectory = resolveCliWorkingDirectory({
      requestedDirectory: workingDirectory,
      workspaceRoot,
    })
  } catch (error) {
    return toBadWorkingDirectoryResponse(context, error)
  }

  const persistedSessionId =
    resumeSessionId !== undefined && resumeSessionId.trim().length > 0
      ? resumeSessionId.trim()
      : getPersistedSessionId(conversationId)
  const resumeArgs = buildResumeArgs({args, persistedSessionId, subcommand})
  const cliArgs = clearEmptyItems([
    subcommand,
    ...DEFAULT_AGENT_CLI_ARGS,
    ...resumeArgs,
    ...args,
    prompt,
  ])

  return streamSSE(context, async (sse) => {
    try {
      const subprocess = execa(cli, cliArgs, {
        cwd: cliWorkingDirectory,
        reject: false,
        stderr: 'pipe',
        stdout: 'pipe',
      })

      const sessionTracker = createSessionTracker()
      const finished = await forwardStreamsToSse(subprocess, sse, sessionTracker.onStdoutChunk)
      const nextSessionId = sessionTracker.getSessionId()

      if (conversationId !== undefined && nextSessionId !== undefined) {
        setPersistedSessionId({conversationId, sessionId: nextSessionId})
      }

      await sse.writeSSE({
        data: JSON.stringify({
          code: finished.exitCode,
          signal: finished.signal ?? null,
        }),
        event: 'exit',
      })
    } catch (error) {
      await sse.writeSSE({
        data: JSON.stringify({
          message: error instanceof Error ? error.message : String(error),
        }),
        event: 'error',
      })
    }
  })
})

const sessionsQuerySchema = z.object({
  workingDirectory: z
    .string()
    .trim()
    .min(1, '`workingDirectory` query is required (non-empty string).'),
})

agentRoute.get(
  '/sessions/:sessionId/history',
  sValidator('query', sessionsQuerySchema),
  async (context) => {
    const sessionId = context.req.param('sessionId')?.trim() ?? ''

    if (sessionId === '') {
      return context.json({error: '`sessionId` path segment is required.'}, HTTP_STATUS_BAD_REQUEST)
    }

    const {workingDirectory} = context.req.valid('query')
    const agentEnv = env<AppEnv>(context)
    const workspaceRoot = agentEnv.AGENT_WORKSPACE_ROOT

    if (workspaceRoot === undefined || workspaceRoot.trim() === '') {
      throw new Error('AGENT_WORKSPACE_ROOT is required.')
    }

    let resolvedWorkingDirectory: string

    try {
      resolvedWorkingDirectory = resolveCliWorkingDirectory({
        requestedDirectory: workingDirectory,
        workspaceRoot,
      })
    } catch (error) {
      return toBadWorkingDirectoryResponse(context, error)
    }

    try {
      const transcriptPath = await resolveAgentSessionJsonlFilePath({
        sessionId,
        workingDirectory: resolvedWorkingDirectory,
        workspaceRoot,
      })

      if (transcriptPath === undefined) {
        return context.json({error: '세션 로그를 찾을 수 없습니다.'}, HTTP_STATUS_NOT_FOUND)
      }

      const messages = await readAgentSessionHistory({
        sessionId,
        workingDirectory: resolvedWorkingDirectory,
        workspaceRoot,
      })

      return context.json({messages})
    } catch {
      return context.json(
        {error: '세션 기록을 읽는 중 오류가 발생했습니다.'},
        HTTP_STATUS_INTERNAL_SERVER_ERROR,
      )
    }
  },
)

agentRoute.get('/sessions', sValidator('query', sessionsQuerySchema), async (context) => {
  const {workingDirectory} = context.req.valid('query')
  const agentEnv = env<AppEnv>(context)
  const workspaceRoot = agentEnv.AGENT_WORKSPACE_ROOT

  if (workspaceRoot === undefined || workspaceRoot.trim() === '') {
    throw new Error('AGENT_WORKSPACE_ROOT is required.')
  }

  let resolvedWorkingDirectory: string

  try {
    resolvedWorkingDirectory = resolveCliWorkingDirectory({
      requestedDirectory: workingDirectory,
      workspaceRoot,
    })
  } catch (error) {
    return toBadWorkingDirectoryResponse(context, error)
  }

  try {
    const sessions = await listSessionsByWorkingDirectory(workspaceRoot, resolvedWorkingDirectory)
    return context.json({sessions})
  } catch {
    return context.json({sessions: []})
  }
})
