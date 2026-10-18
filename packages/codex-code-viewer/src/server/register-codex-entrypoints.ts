import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {getResourcePath} from '@openai/mcp-extensions/server'
import {z} from 'zod'
import {FILE_EXTENSIONS} from '../shared/file-formats'
import {failure} from '../shared/contracts'
import type {createSessions} from './create-sessions'
import {toolResult} from './tool-result'

/** Registers the Codex file-entry tools against the shared viewer sessions. */
export const registerCodexEntrypoints = (
  server: McpServer,
  sessions: Pick<ReturnType<typeof createSessions>, 'open'>,
  resourceUri: string,
): void => {
  const appMetadata = {ui: {resourceUri}}
  const appOnly = {ui: {visibility: ['app']}}
  const annotations = {destructiveHint: false, openWorldHint: false, readOnlyHint: true}
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
      return toolResult(path === undefined ? failure('host-path-missing') : sessions.open(path))
    },
  )
}
