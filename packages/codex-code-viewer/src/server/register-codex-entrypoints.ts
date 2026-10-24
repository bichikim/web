import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {getResourcePath} from '@openai/mcp-extensions/server'
import {z} from 'zod'
import {FILE_EXTENSIONS} from '../shared/file-formats'
import {failure} from '../shared/contracts'
import type {createSessions} from './create-sessions'
import {toolResult} from './tool-result'

interface CodexSessionOpener {
  /** 채팅 메타데이터에 저장된 작업 폴더를 기준으로 파일을 엽니다. */
  readonly open: (
    path: string,
    line?: number,
    column?: number,
    metadata?: unknown,
  ) => ReturnType<ReturnType<typeof createSessions>['open']>
}

/** Registers the Codex file-entry tools against the shared viewer sessions. */
export const registerCodexEntrypoints = (
  server: McpServer,
  sessions: CodexSessionOpener,
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
      return toolResult(
        path === undefined
          ? failure('host-path-missing')
          : sessions.open(path, 1, 1, context._meta),
      )
    },
  )
}
