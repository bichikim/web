import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'
import {readContext} from './read-context'
import {toolResult} from './tool-result'

/** Registers bounded local text and directory context for the app and model. */
export const registerContextTool = (server: McpServer, root: string): void => {
  server.registerTool(
    'code.context',
    {
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: true},
      description: [
        'Read file text or list a folder inside the configured workspace.',
        'Returns at most 200 lines or entries and 64 KiB.',
        'Use line to read subsequent file ranges. Does not read binary media.',
      ].join(' '),
      inputSchema: {
        endLine: z.number().int().positive().optional(),
        line: z.number().int().positive().default(1),
        path: z.string(),
      },
      title: 'Read workspace context',
    },
    async (input) => {
      const result = await readContext({root, ...input})
      return result.ok
        ? {content: [{text: result.value.text, type: 'text' as const}]}
        : toolResult(result)
    },
  )
}
