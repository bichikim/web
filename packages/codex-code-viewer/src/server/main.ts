import {readFile} from 'node:fs/promises'
import {homedir} from 'node:os'
import {join} from 'node:path'
import {StdioServerTransport} from '@modelcontextprotocol/sdk/server/stdio.js'
import {createServer} from './create-server'
import {createThreadWorkspaces} from './create-thread-workspaces'
import {readCodexWorkspace} from './read-codex-workspace'
import {createThreadTreeState} from './create-thread-tree-state'
import {createThreadMemos} from './create-thread-memos'

const html = await readFile(new URL('./app.html', import.meta.url), 'utf8')
const home = process.env.CODEX_HOME ?? join(homedir(), '.codex')
const {dispose, server} = createServer(html, {
  threadMemos: createThreadMemos(home),
  threadTreeState: createThreadTreeState(home),
  threadWorkspaces: createThreadWorkspaces(home),
  workspace: (metadata) => readCodexWorkspace({home, metadata}),
})
process.once('SIGINT', dispose)
process.once('SIGTERM', dispose)
await server.connect(new StdioServerTransport())
