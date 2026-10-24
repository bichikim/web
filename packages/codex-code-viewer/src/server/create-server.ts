import {SOURCE_CHUNK_LENGTH} from '../shared/reading-limits'
import {registerClipboardTools} from './register-clipboard-tools'
import type {ClipboardPort} from './create-clipboard'
import {registerPreviewTools} from './register-preview-tools'
import {resolveNavigation} from './resolve-navigation'
import {MAX_CODE_BYTES, MAX_DRAFT_FILES} from '../shared/editing-limits'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {getResourcePath} from '@openai/mcp-extensions/server'
import {z} from 'zod'
import manifest from '../../package.json'
import {
  codeSourceSchema,
  failure,
  type NavigationResult,
  type Result,
  success,
} from '../shared/contracts'
import {createSessions} from './create-sessions'
import {toolResult} from './tool-result'
import {registerCodexEntrypoints} from './register-codex-entrypoints'
import {createWorkspaceEvents} from './create-workspace-events'
import {filterScan} from './filter-scan'
import {registerFileOperations} from './register-file-operations'
import {registerViewerResource} from './register-viewer-resource'
import {createMcpStreams} from './create-mcp-streams'
import {createWorkspaceNotifications} from './create-workspace-notifications'
import {registerContextTool} from './register-context-tool'
import {registerAttachmentTools} from './register-attachment-tools'
import type {createThreadWorkspaces} from './create-thread-workspaces'
import {registerWorkspaceSettings} from './register-workspace-settings'
import {registerUpdateTools} from './register-update-tools'
import type {createThreadTreeState} from './create-thread-tree-state'
import {restoreTreeState} from './restore-tree-state'
import {registerTreeState} from './register-tree-state'

const appOnly = {ui: {visibility: ['app']}}
const MAX_ENTRY_NAME_LENGTH = 255
const annotations = {destructiveHint: false, openWorldHint: false, readOnlyHint: true}

interface ServerOptions {
  /** 채팅별 파일트리 저장소입니다. 생략하면 상태를 저장하지 않습니다. */
  readonly threadTreeState?: ReturnType<typeof createThreadTreeState>
  /** 채팅별 작업 폴더 저장소입니다. 생략하면 폴더 변경 도구를 등록하지 않습니다. */
  readonly threadWorkspaces?: ReturnType<typeof createThreadWorkspaces>
  readonly clipboard?: ClipboardPort
  readonly integration?: 'codex' | 'standard'
  readonly workspaceRoot?: string
  readonly workspace?: (metadata: unknown) => Result<string | undefined>
}

const registerChatSettings = (
  server: McpServer,
  sessions: ReturnType<typeof createSessions>,
  options: ServerOptions,
): void => {
  if (options.integration === 'standard') {
    return
  }
  if (options.threadWorkspaces !== undefined) {
    registerWorkspaceSettings(server, sessions, options.threadWorkspaces, options.threadTreeState)
  }
  if (options.threadTreeState !== undefined) {
    registerTreeState(server, sessions.withSession, options.threadTreeState)
  }
}

const registerPanel = (
  server: McpServer,
  sessions: ReturnType<typeof createSessions>,
  options: ServerOptions,
  resourceUri: string,
): void => {
  server.registerTool(
    'code.panel',
    {
      _meta: {
        ...(options.integration === 'standard'
          ? {}
          : {'openai/ui': {entrypoints: [{type: 'thread'}]}}),
        ui: {resourceUri},
      },
      annotations,
      inputSchema: {},
      title: 'Code Viewer',
    },
    async (_input, context) => {
      const hostPath =
        options.integration === 'standard' ? options.workspaceRoot : getResourcePath(context._meta)
      const saved = options.threadWorkspaces?.read(context._meta) ?? success(undefined)
      if (!saved.ok) {
        return toolResult(saved)
      }
      const workspace =
        saved.value === undefined
          ? hostPath === undefined
            ? (options.workspace?.(context._meta) ?? success(undefined))
            : success(hostPath)
          : saved
      if (!workspace.ok) {
        return toolResult(workspace)
      }
      return workspace.value === undefined
        ? {content: [], structuredContent: {panel: true}}
        : toolResult(
            restoreTreeState(
              sessions.connect(workspace.value),
              options.threadTreeState,
              context._meta,
            ),
          )
    },
  )
}

const registerTree = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
  updates: ReturnType<typeof createWorkspaceEvents>,
  streams: ReturnType<typeof createMcpStreams>,
): void => {
  server.registerTool(
    'code.tree',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {
        directories: z.array(z.string()).optional(),
        query: z.string().default(''),
        session: z.string(),
        stream: z.boolean().default(false),
        transport: z.enum(['http', 'mcp']).default('http'),
        versions: z.record(z.string(), z.string()).optional(),
      },
      title: 'List workspace file tree',
    },
    async ({session, directories, versions, query, stream, transport}) =>
      stream
        ? withSession(session, async (workspace) => {
            if (directories !== undefined) {
              workspace.observe(directories)
            }
            return success({
              url: await (transport === 'mcp' ? streams.open : updates.scan)(
                session,
                'tree',
                (signal) => filterScan(workspace.scan(directories, signal, versions), query),
              ),
            })
          })
        : withSession(session, async (workspace) => success(await workspace.tree())),
  )
}

const registerList = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
  updates: ReturnType<typeof createWorkspaceEvents>,
  streams: ReturnType<typeof createMcpStreams>,
): void => {
  server.registerTool(
    'code.list',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {
        query: z.string().default(''),
        session: z.string(),
        stream: z.boolean().default(false),
        transport: z.enum(['http', 'mcp']).default('http'),
      },
      title: 'Find workspace files',
    },
    async ({session, query, stream, transport}) =>
      stream
        ? withSession(session, async (workspace) => {
            return success({
              url: await (transport === 'mcp' ? streams.open : updates.scan)(
                session,
                'search',
                (signal) => filterScan(workspace.scan(undefined, signal), query, true),
              ),
            })
          })
        : withSession(session, async (workspace) => success({paths: await workspace.list(query)})),
  )
}

const registerMedia = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
): void => {
  server.registerTool(
    'code.media',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {
        offset: z.number().int().nonnegative(),
        path: z.string(),
        revision: z.string(),
        session: z.string(),
      },
      title: 'Read local media chunk',
    },
    async ({session, path, revision, offset}) =>
      withSession(session, (workspace) => {
        const result = workspace.media(path, revision, offset)
        return result.ok ? success({...result.value}) : result
      }),
  )
}

const registerEditing = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
): void => {
  server.registerTool(
    'code.create',
    {
      _meta: appOnly,
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: false},
      inputSchema: {
        kind: z.enum(['file', 'directory']),
        name: z.string().min(1).max(MAX_ENTRY_NAME_LENGTH),
        parent: z.string(),
        session: z.string(),
      },
      title: 'Create an empty workspace file or folder',
    },
    async ({session, parent, name, kind}) =>
      withSession(session, (workspace) => workspace.create(parent, name, kind)),
  )
  server.registerTool(
    'code.write',
    {
      _meta: appOnly,
      annotations: {destructiveHint: true, openWorldHint: false, readOnlyHint: false},
      inputSchema: {
        path: z.string(),
        revision: z.string().nullable(),
        session: z.string(),
        source: z.string().max(MAX_CODE_BYTES),
      },
      title: 'Save or recreate an editable text file',
    },
    async ({session, path, source, revision}) =>
      withSession(session, (workspace) => {
        const result = workspace.write(path, source, revision)
        return result.ok ? success({document: result.value}) : result
      }),
  )
}

const registerNavigation = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
  updates: ReturnType<typeof createWorkspaceEvents>,
  streams: ReturnType<typeof createMcpStreams>,
): void => {
  const pathInput = {path: z.string(), session: z.string()}
  server.registerTool(
    'code.navigate',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {
        ...pathInput,
        navigation: z.enum(['definition', 'path']),
        offset: z.number().int().nonnegative(),
        revision: z.string(),
        sources: z.array(codeSourceSchema).max(MAX_DRAFT_FILES).optional(),
        stream: z.boolean().default(false),
        transport: z.enum(['http', 'mcp']).default('http'),
      },
      title: 'Follow import or definition',
    },
    async ({session, path, offset, navigation, revision, sources, stream, transport}) =>
      withSession(session, async (workspace): Promise<Result<NavigationResult | {url: string}>> => {
        if (stream) {
          return success({
            url: await (transport === 'mcp' ? streams.open : updates.scan)(
              session,
              'navigation',
              (signal) =>
                workspace.scanNavigation({navigation, offset, path, revision, sources}, signal),
            ),
          })
        }
        const current = workspace.read(path)
        if (!current.ok) {
          return current
        }
        if (current.value.revision !== revision) {
          return failure('stale-document')
        }
        return resolveNavigation({
          document: current.value,
          navigation,
          offset,
          path,
          sources,
          workspace,
        })
      }),
  )
}

const registerScanTools = (
  server: McpServer,
  streams: ReturnType<typeof createMcpStreams>,
): void => {
  server.registerTool(
    'code.stream.read',
    {_meta: appOnly, annotations, inputSchema: {url: z.string()}, title: 'Read next scan batch'},
    async ({url}) => {
      try {
        return toolResult(success(await streams.read(url)))
      } catch {
        return toolResult(failure('read-failed'))
      }
    },
  )
  server.registerTool(
    'code.stream.close',
    {_meta: appOnly, annotations, inputSchema: {url: z.string()}, title: 'Close scan cursor'},
    async ({url}) => {
      streams.close(url)
      return toolResult(success({closed: true}))
    },
  )
}

const registerRead = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
): void => {
  const pathInput = {path: z.string(), session: z.string()}
  server.registerTool(
    'code.source',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {...pathInput, offset: z.number().int().nonnegative(), revision: z.string()},
      title: 'Read source chunk',
    },
    async ({session, path, revision, offset}) =>
      withSession(session, (workspace) => {
        const document = workspace.read(path)
        if (!document.ok) {
          return document
        }
        if (document.value.revision !== revision) {
          return failure('stale-document')
        }
        if (offset > document.value.source.length) {
          return failure('invalid-position')
        }
        const data = document.value.source.slice(offset, offset + SOURCE_CHUNK_LENGTH)
        return success({data, next: offset + data.length})
      }),
  )
  server.registerTool(
    'code.read',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {
        ...pathInput,
        column: z.number().int().positive().default(1),
        line: z.number().int().positive().default(1),
      },
      title: 'Read code file',
    },
    async ({session, path, line, column}) =>
      withSession(session, (workspace) => {
        const document = workspace.read(path, line, column)
        if (document.ok) {
          workspace.warmNavigation(document.value.location.path)
        }
        return document.ok ? success({document: document.value}) : document
      }),
  )
}

export const createServer = (html: string, options: ServerOptions = {}) => {
  const server = new McpServer(
    {name: 'codex-code-viewer', title: 'Code Viewer', version: manifest.version},
    options.integration === 'standard'
      ? {
          instructions: [
            'When the user refers to Code Viewer attachments or selected/unsaved code, call code.attachments',
            'with the session from code.open or code.panel before answering. Attached snapshots may differ from disk.',
            'Do not open a new session to read existing attachments.',
          ].join(' '),
        }
      : undefined,
  )
  registerUpdateTools(server, options.integration === 'standard' ? 'claude' : 'codex')
  const updates = createWorkspaceEvents()
  const streams = createMcpStreams()
  const notifications = createWorkspaceNotifications()
  const contexts = new Map<string, readonly string[]>()
  const sessions = createSessions({
    onChange: (session) => {
      updates.changed(session)
      notifications.changed(session)
    },
    onClose: (session) => {
      contexts.delete(session)
      updates.closed(session)
      streams.closeSession(session)
      notifications.close(session)
    },
    workspaceRoot: options.workspaceRoot,
  })
  const {withSession} = sessions
  const open = (path: string, line = 1, column = 1, metadata?: unknown) => {
    const saved = options.threadWorkspaces?.read(metadata) ?? success(undefined)
    return restoreTreeState(
      saved.ok ? sessions.open(path, line, column, saved.value) : saved,
      options.threadTreeState,
      metadata,
    )
  }
  const resourceUri = registerViewerResource(server, html)
  const appMetadata = {ui: {resourceUri}}
  const pathInput = {path: z.string(), session: z.string()}
  registerPanel(server, sessions, options, resourceUri)
  registerChatSettings(server, sessions, options)
  if (options.integration === 'standard') {
    if (options.workspaceRoot === undefined) {
      throw new Error('A workspace folder is required for the standard desktop server.')
    }
    registerContextTool(server, options.workspaceRoot)
    registerAttachmentTools(server, withSession, contexts, options.clipboard)
  }
  server.registerTool(
    'code.open',
    {
      _meta: {...appMetadata, ui: {...appMetadata.ui, visibility: ['app', 'model']}},
      annotations,
      description:
        'Open local code in Code Viewer with import and definition navigation. Use an absolute path.',
      inputSchema: {
        column: z.number().int().positive().default(1),
        line: z.number().int().positive().default(1),
        path: z.string(),
      },
      title: 'Open code in Code Viewer',
    },
    async ({path, line, column}, context) => toolResult(open(path, line, column, context._meta)),
  )
  if (options.integration !== 'standard') {
    registerCodexEntrypoints(server, {open}, resourceUri)
  }
  registerRead(server, withSession)
  registerNavigation(server, withSession, updates, streams)
  registerList(server, withSession, updates, streams)
  server.registerTool(
    'code.close',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {session: z.string()},
      title: 'Close viewer session',
    },
    async ({session}) => {
      sessions.close(session)
      return {content: [], structuredContent: {closed: true}}
    },
  )
  server.registerTool(
    'code.watch',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {session: z.string(), transport: z.enum(['http', 'mcp']).default('http')},
      title: 'Subscribe to workspace changes',
    },
    async ({session, transport}) =>
      withSession(
        session,
        async (): Promise<Result<{revision: number} | {url: string}>> =>
          transport === 'mcp'
            ? success({revision: notifications.watch(session)})
            : success({url: await updates.watch(session)}),
      ),
  )
  server.registerTool(
    'code.watch.next',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {revision: z.number().int().nonnegative(), session: z.string()},
      title: 'Wait for a workspace change',
    },
    async ({session, revision}, context) =>
      withSession(session, async () =>
        success({revision: await notifications.wait(session, revision, context.signal)}),
      ),
  )
  registerScanTools(server, streams)
  registerTree(server, withSession, updates, streams)
  registerEditing(server, withSession)
  registerFileOperations(server, withSession)
  registerPreviewTools(server, withSession)
  if (options.clipboard !== undefined) {
    registerClipboardTools(server, withSession, options.clipboard)
  }
  registerMedia(server, withSession)
  const dispose = async () => {
    sessions.dispose()
    streams.dispose()
    await updates.dispose()
    await server.close()
  }
  return {dispose, server}
}
