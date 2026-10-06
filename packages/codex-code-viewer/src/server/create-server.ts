import {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {registerAppResource, RESOURCE_MIME_TYPE} from '@modelcontextprotocol/ext-apps/server'
import {getResourcePath} from '@openai/mcp-extensions/server'
import {z} from 'zod'
import {failure, success} from '../shared/contracts'
import {createSessions} from './create-sessions'
import {toolResult} from './tool-result'

const VIEWER_URI = 'ui://codex-code-viewer/app.html'
const annotations = {destructiveHint: false, openWorldHint: false, readOnlyHint: true}

const registerPanel = (server: McpServer): void => {
  server.registerTool(
    'code.panel',
    {
      _meta: {'openai/ui': {entrypoints: [{type: 'thread'}]}, ui: {resourceUri: VIEWER_URI}},
      annotations,
      inputSchema: {},
      title: 'Code Viewer',
    },
    async () => ({content: [], structuredContent: {panel: true}}),
  )
}

export const createServer = (html: string) => {
  const server = new McpServer({name: 'codex-code-viewer', title: 'Code Viewer', version: '0.1.0'})
  const sessions = createSessions()
  const {open, withSession} = sessions
  const appMetadata = {ui: {resourceUri: VIEWER_URI}}
  const appOnly = {ui: {visibility: ['app']}}
  const pathInput = {path: z.string(), session: z.string()}
  registerPanel(server)
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
              extensions: ['.ts', '.tsx', '.mts', '.cts', '.js', '.jsx', '.mjs', '.cjs', '.json'],
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
      },
      title: 'Follow import or definition',
    },
    async ({session, path, offset, navigation, revision}) =>
      withSession(session, (workspace) => {
        const current = workspace.read(path)
        if (!current.ok) {
          return current
        }
        if (current.value.revision !== revision) {
          return failure('stale-document')
        }
        const locations =
          navigation === 'path'
            ? workspace.followPath(path, offset)
            : workspace.definitions(path, offset)
        return locations.ok ? success({locations: locations.value}) : locations
      }),
  )
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
  registerAppResource(server, 'code-viewer', VIEWER_URI, {}, async () => ({
    contents: [
      {
        _meta: {ui: {csp: {connectDomains: [], resourceDomains: []}, prefersBorder: false}},
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
