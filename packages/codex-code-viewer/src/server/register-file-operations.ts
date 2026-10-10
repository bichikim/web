import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'
import {success} from '../shared/contracts'
import type {createSessions} from './create-sessions'

const MAX_NAME_LENGTH = 255

/** Registers app-only, session-scoped file clipboard, renaming and deletion tools. */
export const registerFileOperations = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
): void => {
  const metadata = {ui: {visibility: ['app']}}
  const pathInput = {path: z.string(), session: z.string()}
  const writeAnnotations = {destructiveHint: true, openWorldHint: false, readOnlyHint: false}
  server.registerTool(
    'code.entry',
    {
      _meta: metadata,
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: true},
      inputSchema: pathInput,
      title: 'Inspect a workspace entry before copying, moving or deleting',
    },
    async ({session, path}) =>
      withSession(session, async (workspace) => {
        const result = await workspace.operations.read(path)
        return result.ok
          ? success({
              kind: result.value.kind,
              path: result.value.path,
              revision: result.value.revision,
            })
          : result
      }),
  )
  server.registerTool(
    'code.transfer',
    {
      _meta: metadata,
      annotations: writeAnnotations,
      inputSchema: {
        ...pathInput,
        action: z.enum(['copy', 'cut']),
        parent: z.string(),
        revision: z.string(),
      },
      title: 'Paste a copied or cut workspace entry',
    },
    async ({session, ...input}) =>
      withSession(session, (workspace) => workspace.operations.transfer(input)),
  )
  server.registerTool(
    'code.rename',
    {
      _meta: metadata,
      annotations: writeAnnotations,
      inputSchema: {
        ...pathInput,
        name: z.string().min(1).max(MAX_NAME_LENGTH),
        revision: z.string(),
      },
      title: 'Rename a workspace file or directory',
    },
    async ({session, ...input}) =>
      withSession(session, (workspace) => workspace.operations.rename(input)),
  )
  server.registerTool(
    'code.remove',
    {
      _meta: metadata,
      annotations: writeAnnotations,
      inputSchema: {...pathInput, revision: z.string()},
      title: 'Delete a confirmed workspace entry',
    },
    async ({session, path, revision}) =>
      withSession(session, (workspace) => workspace.operations.remove(path, revision)),
  )
}
