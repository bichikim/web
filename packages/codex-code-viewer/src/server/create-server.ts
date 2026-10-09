import {MAX_CODE_BYTES, MAX_DRAFT_FILES} from '../shared/editing-limits'
import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {registerAppResource, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server'
import {getResourcePath} from '@openai/mcp-extensions/server'
import {z} from 'zod'
import manifest from '../../package.json'
import {codeSourceSchema, failure, type Result, success} from '../shared/contracts'
import {createSessions} from './create-sessions'
import {toolResult} from './tool-result'
import {FILE_EXTENSIONS} from '../shared/file-formats'

const appOnly = {ui: {visibility: ['app']}}
const VIEWER_URI = 'ui://codex-code-viewer/app.html'
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
): void => {
  server.registerTool(
    'code.tree',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {session: z.string()},
      title: 'List workspace file tree',
    },
    async ({session}) => withSession(session, (workspace) => success(workspace.tree())),
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
    'code.write',
    {
      _meta: appOnly,
      annotations: {destructiveHint: true, openWorldHint: false, readOnlyHint: false},
      inputSchema: {
        path: z.string(),
        revision: z.string(),
        session: z.string(),
        source: z.string().max(MAX_CODE_BYTES),
      },
      title: 'Save an existing editable text file',
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
      },
      title: 'Follow import or definition',
    },
    async ({session, path, offset, navigation, revision, sources}) =>
      withSession(session, async (workspace) => {
        const current = workspace.read(path)
        if (!current.ok) {
          return current
        }
        if (current.value.revision !== revision) {
          return failure('stale-document')
        }
        const locations =
          navigation === 'path'
            ? await workspace.followPath(path, offset, sources)
            : await workspace.definitions(path, offset, sources)
        return locations.ok ? success({locations: locations.value}) : locations
      }),
  )
}

export const createServer = (html: string, options: ServerOptions = {}) => {
  const server = new McpServer({
    name: 'codex-code-viewer',
    title: 'Code Viewer',
    version: manifest.version,
  })
  const sessions = createSessions()
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
  registerNavigation(server, withSession)
  server.registerTool(
    'code.list',
    {
      _meta: appOnly,
      annotations,
      inputSchema: {query: z.string().default(''), session: z.string()},
      title: 'Find workspace files',
    },
    async ({session, query}) =>
      withSession(session, (workspace) => success({paths: workspace.list(query)})),
  )
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
  registerTree(server, withSession)
  registerEditing(server, withSession)
  registerMedia(server, withSession)
  registerAppResource(server, 'code-viewer', VIEWER_URI, {}, async () => ({
    contents: [
      {
        _meta: {ui: {csp: {connectDomains: [], resourceDomains: ['blob:']}, prefersBorder: false}},
        mimeType: RESOURCE_MIME_TYPE,
        text: html,
        uri: VIEWER_URI,
      },
    ],
  }))
  const dispose = async () => {
    sessions.dispose()
    await server.close()
  }
  return {dispose, server}
}
