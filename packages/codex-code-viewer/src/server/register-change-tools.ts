import {z} from 'zod'
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import type {createSessions} from './create-sessions'
import {success} from '../shared/contracts'

/** Exposes Git comparison metadata only to the viewer attached to the workspace session. */
export const registerChangeTools = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
): void => {
  server.registerTool(
    'code.changes',
    {
      _meta: {ui: {visibility: ['app']}},
      annotations: {
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
        readOnlyHint: true,
      },
      inputSchema: {path: z.string().optional(), session: z.string()},
      title: 'Read all workspace changes or a file baseline',
    },
    ({session, path}) =>
      withSession(session, async (workspace) =>
        success(path === undefined ? await workspace.changes() : await workspace.baseline(path)),
      ),
  )
}
