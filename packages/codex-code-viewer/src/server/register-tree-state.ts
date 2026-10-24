import type {McpServer} from '@modelcontextprotocol/sdk/server/mcp.js'
import {z} from 'zod'
import {treeStateSchema} from '../shared/tree-state'
import type {createSessions} from './create-sessions'
import type {createThreadTreeState} from './create-thread-tree-state'

/** 파일트리 상태를 호출한 채팅과 검증된 세션의 작업 폴더에 저장합니다. */
export const registerTreeState = (
  server: McpServer,
  withSession: ReturnType<typeof createSessions>['withSession'],
  storage: ReturnType<typeof createThreadTreeState>,
): void => {
  server.registerTool(
    'code.tree-state',
    {
      _meta: {ui: {visibility: ['app']}},
      annotations: {destructiveHint: false, openWorldHint: false, readOnlyHint: false},
      inputSchema: {patch: treeStateSchema, session: z.string()},
      title: 'Save this chat’s file tree state',
    },
    async ({session, patch}, context) =>
      withSession(session, (workspace) => storage.write(context._meta, workspace.root, patch)),
  )
}
