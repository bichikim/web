import {resolveNavigation} from './resolve-navigation'
import {MAX_CODE_BYTES, MAX_DRAFT_FILES} from '../shared/editing-limits'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {registerAppResource, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server'
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
import {FILE_EXTENSIONS} from '../shared/file-formats'
import {createWorkspaceEvents} from './create-workspace-events'
import {filterScan} from './filter-scan'
import {registerFileOperations} from './register-file-operations'

const appOnly = {ui: {visibility: ['app']}}
const VIEWER_URI = 'ui://codex-code-viewer/app.html'
const MAX_ENTRY_NAME_LENGTH = 255
const annotations = {destructiveHint: false, openWorldHint: false, readOnlyHint: true}

interface ServerOptions {
  readonly workspace?: (metadata: unknown) => Result<string | undefined>
}

const registerPanel = (
  server: McpServer,
  sessions: ReturnType<typeof createSessions>,
  options: ServerOptions,
): void => {
  server.registerTool(
    'code.panel',
    {
      _meta: {'openai/ui': {entrypoints: [{type: 'thread'}]}, ui: {resourceUri: VIEWER_URI}},
      annotations,
      inputSchema: {},
      title: 'Code Viewer',
    },
    async (_input, context) => {
      const hostPath = getResourcePath(context._meta)
      const workspace =
        hostPath === undefined
          ? (options.workspace?.(context._meta) ?? success(undefined))
          : success(hostPath)
      if (!workspace.ok) {
        return toolResult(workspace)
      }
      return workspace.value === undefined
        ? {content: [], structuredContent: {panel: true}}
        : toolResult(sessions.connect(workspace.value))
    },
  )
}

const registerTree = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
  updates: ReturnType<typeof createWorkspaceEvents>,
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
      },
      title: 'List workspace file tree',
    },
    async ({session, directories, query, stream}) =>
      stream
        ? withSession(session, async (workspace) => {
            if (directories !== undefined) {
              workspace.observe(directories)
            }
            return success({
              url: await updates.scan(session, 'tree', (signal) =>
                filterScan(workspace.scan(directories, signal), query),
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
      },
      title: 'Find workspace files',
    },
    async ({session, query, stream}) =>
      stream
        ? withSession(session, async (workspace) => {
            return success({
              url: await updates.scan(session, 'search', (signal) =>
                filterScan(workspace.scan(undefined, signal), query, true),
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
      },
      title: 'Follow import or definition',
    },
    async ({session, path, offset, navigation, revision, sources, stream}) =>
      withSession(session, async (workspace): Promise<Result<NavigationResult | {url: string}>> => {
        if (stream) {
          return success({
            url: await updates.scan(session, 'navigation', (signal) =>
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

export const createServer = (html: string, options: ServerOptions = {}) => {
  const server = new McpServer({
    name: 'codex-code-viewer',
    title: 'Code Viewer',
    version: manifest.version,
  })
  const updates = createWorkspaceEvents()
  const sessions = createSessions({
    onChange: (session) => updates.changed(session),
    onClose: (session) => updates.closed(session),
  })
  const {open, withSession} = sessions
  const appMetadata = {ui: {resourceUri: VIEWER_URI}}
  const pathInput = {path: z.string(), session: z.string()}
  registerPanel(server, sessions, options)
  server.registerTool(
    'code.open',
    {
      _meta: {...appMetadata, ui: {...appMetadata.ui, visibility: ['app', 'model']}},
      annotations,
      description:
        'Open local code inside Codex with import and definition navigation. Use an absolute path.',
      inputSchema: {
        column: z.number().int().positive().default(1),
        line: z.number().int().positive().default(1),
        path: z.string(),
      },
      title: 'Open code in Code Viewer',
    },
    async ({path, line, column}) => toolResult(open(path, line, column)),
  )
  server.registerTool(
    'code.file',
    {
      _meta: {
        ...appMetadata,
        'openai/ui': {
          entrypoints: [
            {
              extensions: FILE_EXTENSIONS,
              type: 'file',
            },
          ],
        },
      },
      annotations,
      inputSchema: {file: z.object({name: z.string().min(1), resourceUri: z.string().min(1)})},
      title: 'Code Viewer',
    },
    async ({file}) => ({content: [], structuredContent: {file}}),
  )
  server.registerTool(
    'code.attach',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {},
      title: 'Connect opened workspace file',
    },
    async (_input, context) => {
      const path = getResourcePath(context._meta)
      return toolResult(path === undefined ? failure('host-path-missing') : open(path))
    },
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
        return document.ok ? success({document: document.value}) : document
      }),
  )
  registerNavigation(server, withSession, updates)
  registerList(server, withSession, updates)
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
      inputSchema: {session: z.string()},
      title: 'Subscribe to workspace changes',
    },
    async ({session}) =>
      withSession(session, async () => success({url: await updates.watch(session)})),
  )
  registerTree(server, withSession, updates)
  registerEditing(server, withSession)
  registerFileOperations(server, withSession)
  registerMedia(server, withSession)
  registerAppResource(server, 'code-viewer', VIEWER_URI, {}, async () => ({
    contents: [
      {
        _meta: {
          ui: {
            csp: {connectDomains: ['http://127.0.0.1:*'], resourceDomains: ['blob:']},
            prefersBorder: false,
          },
        },
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        uri: VIEWER_URI,
      },
    ],
  }))
  const dispose = async () => {
    sessions.dispose()
    await updates.dispose()
    await server.close()
  }
  return {dispose, server}
}
