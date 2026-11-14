import {App} from '@modelcontextprotocol/ext-apps'
import type {Protocol} from '@modelcontextprotocol/sdk/shared/protocol.js'
import type {Notification, Request, Result} from '@modelcontextprotocol/sdk/types.js'
import {z} from 'zod'
import manifest from '../../package.json'
import {OpenAIExtensions, OpenAIFileEntrypointInputSchema} from '@openai/mcp-extensions/app'
import {subscribeWorkspace} from './subscribe-workspace'
import {connectionSchema, type ViewerConnection, workspaceSessionSchema} from '../shared/contracts'
import type {ViewerPort} from './types'
import {connectHostAppearance} from './connect-host-appearance'
import {createHostContext} from './create-host-context'
import {createPendingTasks} from './create-pending-tasks'
import {createHostChanges} from './create-host-changes'
import {subscribeWorkspaceChanges} from './subscribe-workspace-changes'
import {errorMessage} from './error-message'
import {callViewerTool} from './call-viewer-tool'
import {createHostAttachments} from './create-host-attachments'
import {createTreeStateWriter} from './create-tree-state-writer'
import {createHostMemos} from './create-host-memos'

const httpStreams = (app: App): boolean =>
  z
    .object({version: z.literal(1)})
    .safeParse(app.getHostCapabilities()?.experimental?.['winter-love/code-viewer/http']).success

const createToolCall =
  (app: App, requests: ReturnType<typeof createPendingTasks>): ViewerPort['call'] =>
  (name, arguments_, options) =>
    requests.run(() => {
      const input = {
        arguments:
          arguments_.stream === true
            ? {...arguments_, transport: httpStreams(app) ? 'http' : 'mcp'}
            : arguments_,
        name,
      }
      return options === undefined ? app.callServerTool(input) : app.callServerTool(input, options)
    })

interface HostOptions {
  readonly draftStorage?: ViewerPort['draftStorage']
  readonly composerAttachment?: boolean
  readonly fileClipboard?: boolean
  readonly integration?: 'codex' | 'standard'
}
const stageContext = async (
  call: ViewerPort['call'],
  session: string | undefined,
  content: readonly string[],
): Promise<void> => {
  if (session === undefined) {
    throw new Error('파일을 먼저 열어 주세요.')
  }
  const result = await call('code.stage-context', {content, session})
  if (result.isError) {
    throw new Error(errorMessage(result.structuredContent))
  }
}
const receiveConnection = (
  receive: Parameters<ViewerPort['start']>[0],
  connection: ViewerConnection,
  metadata?: Record<string, unknown>,
): void => {
  const navigation = z
    .object({restoreView: z.boolean()})
    .safeParse(metadata?.['winter-love/code-viewer/navigation'])
  if (navigation.success) {
    receive(connection, navigation.data)
  } else {
    receive(connection)
  }
}
const changeWorkspace = (call: ViewerPort['call'], path: string) =>
  callViewerTool({
    input: {path},
    name: 'code.workspace',
    port: {call},
    schema: workspaceSessionSchema,
  })

const createFileOpening =
  (
    extensions: OpenAIExtensions | undefined,
    requests: ReturnType<typeof createPendingTasks>,
  ): NonNullable<ViewerPort['openFile']> =>
  (path) =>
    requests.run(async () => {
      const files = extensions?.files
      if (files === undefined) {
        throw new Error('이 호스트에서는 파일을 새 탭에서 열 수 없습니다.')
      }
      await files.open(path)
    })

const finishTeardown = async (
  cleanup: (() => Promise<void>) | undefined,
  settle: () => Promise<void>,
): Promise<Record<string, never>> => {
  await cleanup?.()
  await settle()
  return {}
}

const createHostLocale = (app: App) => {
  const listeners = new Set<(locale: string | undefined) => void>()
  return {
    publish: (): void => {
      const locale = app.getHostContext()?.locale
      listeners.forEach((receive) => receive(locale))
    },
    subscribeLocale: (receive: (locale: string | undefined) => void): (() => void) => {
      listeners.add(receive)
      receive(app.getHostContext()?.locale)
      return () => {
        listeners.delete(receive)
      }
    },
  }
}

export const createHost = (options: HostOptions = {}): ViewerPort => {
  const standard = options.integration === 'standard'
  const app = new App({name: 'Code Viewer', version: manifest.version}, {}, {autoResize: standard})
  const extensions = standard ? undefined : new OpenAIExtensions(app)
  // The base protocol carries custom methods, as in the OpenAI extensions adapter.
  const protocol = app as Protocol<Request, Notification, Result>
  const requests = createPendingTasks()
  let connection: Promise<void> | null = null
  let session: string | undefined
  const rememberSession = (result: {structuredContent?: Record<string, unknown>}): void => {
    const parsed = connectionSchema.safeParse(result.structuredContent)
    if (parsed.success) {
      const {session: nextSession} = parsed.data
      session = nextSession
    }
  }
  const callTool = createToolCall(app, requests)
  const call: ViewerPort['call'] = async (name, input, options) => {
    if (name === 'code.close') {
      await treeWriter.settle()
    }
    const result = await callTool(name, input, options)
    rememberSession(result)
    return result
  }
  const treeWriter = createTreeStateWriter({call, requests})
  const memos = standard
    ? {}
    : createHostMemos({
        call,
        ready: () => connection,
        requests,
      })
  const {publish: publishLocale, subscribeLocale} = createHostLocale(app)
  const {synchronize: synchronizeContext, ...context} = createHostContext({
    app,
    call,
    current: () => extensions?.modelContext?.getCurrent(),
    requests,
    stage: standard ? (content) => stageContext(call, session, content) : undefined,
    standard,
  })
  return {
    ...memos,
    changeWorkspace: standard ? undefined : (path) => changeWorkspace(call, path),
    draftStorage: options.draftStorage,
    openFile: standard ? undefined : createFileOpening(extensions, requests),
    saveTreeState: standard ? undefined : treeWriter.save,
    ...context,
    ...createHostChanges(call),
    ...createHostAttachments({
      call,
      clear: context.removeContext,
      clipboard: options.fileClipboard,
      composer: options.composerAttachment,
      session: () => session,
      standard,
    }),
    call,
    location: async (location) => {
      const capability =
        app.getHostCapabilities()?.experimental?.['winter-love/file-viewer/location']
      if (!z.object({version: z.literal(1)}).safeParse(capability).success) {
        return
      }
      await requests.run(() =>
        protocol.request(
          {method: 'winter-love/file-viewer/location', params: {...location}},
          z.object({}),
        ),
      )
    },
    start: async (receive, report, _refresh, onTeardown) => {
      let stopped = false
      const handleResult = (result: {
        _meta?: Record<string, unknown>
        isError?: boolean
        structuredContent?: Record<string, unknown>
      }): void => {
        if (result.isError) {
          report(result.structuredContent)
          return
        }
        const parsed = connectionSchema.safeParse(result.structuredContent)
        if (parsed.success) {
          rememberSession(result)
          receiveConnection(receive, parsed.data, result._meta)
        }
      }
      const handleFile = async (input: {arguments?: Record<string, unknown>}): Promise<void> => {
        const parsed = OpenAIFileEntrypointInputSchema.safeParse(input.arguments)
        if (!parsed.success) {
          return
        }
        await connected
        if (stopped) {
          return
        }
        const result = await call('code.attach', {})
        if (result.isError) {
          report(result.structuredContent)
          return
        }
        handleResult(result)
      }
      const handleInput = (input: {arguments?: Record<string, unknown>}): void => {
        if (!standard) {
          requests.run(() => handleFile(input)).catch(report)
        }
      }
      const removeListeners = (): void => {
        app.removeEventListener('toolresult', handleResult)
        app.removeEventListener('toolinput', handleInput)
        app.removeEventListener('hostcontextchanged', synchronizeContext)
        app.removeEventListener('hostcontextchanged', publishLocale)
      }
      app.addEventListener('toolresult', handleResult)
      app.addEventListener('toolinput', handleInput)
      app.addEventListener('hostcontextchanged', synchronizeContext)
      app.addEventListener('hostcontextchanged', publishLocale)
      app.onteardown = () => finishTeardown(onTeardown, requests.settle)
      const connected = app.connect()
      connection = connected
      try {
        await connected
      } catch (error) {
        stopped = true
        removeListeners()
        await requests.settle()
        await app.close().catch(report)
        throw error
      }
      synchronizeContext()
      publishLocale()
      const disposeAppearance = connectHostAppearance(app)
      return async () => {
        stopped = true
        disposeAppearance()
        removeListeners()
        await requests.settle()
        await app.close().catch(report)
      }
    },
    subscribeLocale,
    watch: (session, receive, report) =>
      httpStreams(app)
        ? subscribeWorkspace({call, receive, session})
        : subscribeWorkspaceChanges({call, receive, report, session}),
  }
}
