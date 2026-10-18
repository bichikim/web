import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'
import {MAX_CODE_BYTES} from '../shared/editing-limits'
import type {createSessions} from './create-sessions'
import type {ClipboardPort} from './create-clipboard'
import {success} from '../shared/contracts'
/** Registers local clipboard operations for an explicitly enabled host adapter. */
export const registerClipboardTools = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
  clipboard: ClipboardPort,
): void => {
  const metadata = {
    _meta: {ui: {visibility: ['app']}},
    annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: false},
  }
  server.registerTool(
    'code.copy',
    {
      ...metadata,
      inputSchema: {path: z.string(), session: z.string(), text: z.string().max(MAX_CODE_BYTES)},
      title: 'Copy selected viewer text',
    },
    async ({session, path, text}) =>
      withSession(session, async (workspace) => {
        const document = workspace.read(path, 1, 1)
        if (!document.ok) {
          return document
        }
        const result = await clipboard.write(text)
        return result.ok ? success({copied: true}) : result
      }),
  )
  server.registerTool(
    'code.paste',
    {
      ...metadata,
      inputSchema: {path: z.string(), session: z.string()},
      title: 'Read text for an explicit viewer paste',
    },
    async ({session, path}) =>
      withSession(session, async (workspace) => {
        const document = workspace.read(path, 1, 1)
        if (!document.ok) {
          return document
        }
        const result = await clipboard.read()
        return result.ok ? success({text: result.value}) : result
      }),
  )
}
