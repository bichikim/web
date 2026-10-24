import {isAbsolute} from 'node:path'
import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'
import {failure} from '../shared/contracts'
import type {createSessions} from './create-sessions'
import type {createThreadWorkspaces} from './create-thread-workspaces'
import {toolResult} from './tool-result'
import type {createThreadTreeState} from './create-thread-tree-state'
import {restoreTreeState} from './restore-tree-state'

/** 검증한 작업 폴더를 현재 채팅에 저장하고 연결합니다. */
export const registerWorkspaceSettings = (
  server: McpServer,
  sessions: Pick<ReturnType<typeof createSessions>, 'connect' | 'close'>,
  workspaces: ReturnType<typeof createThreadWorkspaces>,
  trees?: ReturnType<typeof createThreadTreeState>,
): void => {
  server.registerTool(
    'code.workspace',
    {
      _meta: {ui: {visibility: ['app']}},
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: false},
      inputSchema: {path: z.string().min(1)},
      title: 'Change this chat’s viewer workspace',
    },
    async ({path}, context) => {
      if (!isAbsolute(path)) {
        return toolResult(failure('invalid-workspace'))
      }
      const connection = sessions.connect(path)
      if (!connection.ok) {
        return toolResult(failure('invalid-workspace'))
      }
      const saved = workspaces.write(context._meta, connection.value.workspace)
      if (!saved.ok) {
        sessions.close(connection.value.session)
        return toolResult(saved)
      }
      return toolResult(restoreTreeState(connection, trees, context._meta))
    },
  )
}
