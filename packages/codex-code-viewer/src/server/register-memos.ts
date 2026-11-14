import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {memoPatchSchema} from '../shared/memo-state'
import type {createThreadMemos} from './create-thread-memos'
import {toolResult} from './tool-result'

export const registerMemos = (
  server: McpServer,
  storage: ReturnType<typeof createThreadMemos>,
): void => {
  const metadata = {ui: {visibility: ['app']}}
  server.registerTool(
    'code.memos',
    {
      _meta: metadata,
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: true},
      inputSchema: {},
      title: 'Read chat memos',
    },
    async (_input, context) => toolResult(storage.read(context._meta)),
  )
  server.registerTool(
    'code.save-memos',
    {
      _meta: metadata,
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: false},
      inputSchema: {patch: memoPatchSchema},
      title: 'Save chat memos',
    },
    async ({patch}, context) => toolResult(storage.write(context._meta, patch)),
  )
}
