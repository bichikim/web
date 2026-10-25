import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {DatabaseSync} from 'node:sqlite'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {type Result, success, workspaceSessionSchema} from '../../shared/contracts'
import {createServer} from '../create-server'
import {createThreadWorkspaces} from '../create-thread-workspaces'
import {createThreadTreeState} from '../create-thread-tree-state'
import {readCodexWorkspace} from '../read-codex-workspace'

const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
const other = '01a11020-8962-72f1-8735-2a87c41aba83'
let home: string
let original: string
let selected: string
const connections: {client: Client; instance: ReturnType<typeof createServer>}[] = []
const connect = async (
  workspace: (metadata: unknown) => Result<string | undefined> = () => success(original),
) => {
  const instance = createServer('<html>viewer</html>', {
    threadTreeState: createThreadTreeState(home),
    threadWorkspaces: createThreadWorkspaces(home),
    workspace,
  })
  const client = new Client({name: 'workspace-test', version: '1.0.0'})
  const [server, transport] = InMemoryTransport.createLinkedPair()
  await instance.server.connect(server)
  await client.connect(transport)
  connections.push({client, instance})
  return client
}
beforeEach(() => {
  home = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-workspace-api-')))
  original = join(home, 'original')
  selected = join(home, 'selected')
  mkdirSync(original)
  mkdirSync(selected)
  writeFileSync(join(selected, 'notes.txt'), 'selected folder')
  writeFileSync(join(original, 'notes.txt'), 'original folder')
})
afterEach(async () => {
  vi.restoreAllMocks()
  await Promise.all(
    connections.splice(0).map(async ({client, instance}) => {
      await client.close()
      await instance.dispose()
    }),
  )
  rmSync(home, {force: true, recursive: true})
})
it('should open the selected project then the started chat worktree', async () => {
  writeFileSync(
    join(home, '.codex-global-state.json'),
    JSON.stringify({
      'local-projects': {project: {rootPaths: [original]}},
      'selected-project': {projectId: 'project', type: 'local'},
    }),
  )
  const client = await connect((metadata) => readCodexWorkspace({home, metadata}))
  const panel = workspaceSessionSchema.parse(
    (await client.callTool({arguments: {}, name: 'code.panel'})).structuredContent,
  )
  expect(panel.workspace).toBe(original)
  expect(
    await client.callTool({
      arguments: {path: 'notes.txt', session: panel.session},
      name: 'code.read',
    }),
  ).toMatchObject({
    structuredContent: {document: {source: 'original folder'}},
  })
  const database = new DatabaseSync(join(home, 'state_5.sqlite'))
  database.exec('CREATE TABLE threads (id TEXT PRIMARY KEY, cwd TEXT)')
  database.prepare('INSERT INTO threads VALUES (?, ?)').run(threadId, selected)
  database.close()
  const started = workspaceSessionSchema.parse(
    (await client.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'}))
      .structuredContent,
  )
  expect(started.workspace).toBe(selected)
  expect(
    await client.callTool({
      arguments: {path: 'notes.txt', session: started.session},
      name: 'code.read',
    }),
  ).toMatchObject({
    structuredContent: {document: {source: 'selected folder'}},
  })
  expect(
    await client.callTool({
      _meta: {threadId},
      arguments: {path: join(original, 'notes.txt'), session: started.session},
      name: 'code.read',
    }),
  ).toMatchObject({isError: true, structuredContent: {code: 'outside-workspace'}})
  expect(existsSync(join(home, 'code-viewer', 'workspaces'))).toBe(false)
})
it('should open files and repair a corrupted tree preference without changing the workspace', async () => {
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  const client = await connect()
  const panel = workspaceSessionSchema.parse(
    (
      await client.callTool({
        _meta: {threadId},
        arguments: {},
        name: 'code.panel',
      })
    ).structuredContent,
  )
  await client.callTool({
    _meta: {threadId},
    arguments: {patch: {expanded: ['src'], visible: false}, session: panel.session},
    name: 'code.tree-state',
  })
  const directory = join(home, 'code-viewer', 'trees')
  for (const file of readdirSync(directory)) {
    writeFileSync(join(directory, file), '{')
  }
  const reopened = await client.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'})
  expect(reopened.isError).not.toBe(true)
  const connection = workspaceSessionSchema.parse(reopened.structuredContent)
  expect(connection.workspace).toBe(original)
  expect(connection.treeState).toBeUndefined()
  const fileResult = await client.callTool({
    _meta: {threadId},
    arguments: {path: join(original, 'notes.txt')},
    name: 'code.open',
  })
  expect(fileResult.isError).not.toBe(true)
  expect(fileResult.structuredContent).toMatchObject({document: {source: 'original folder'}})
  const saved = await client.callTool({
    _meta: {threadId},
    arguments: {patch: {expanded: [], visible: true}, session: connection.session},
    name: 'code.tree-state',
  })
  expect(saved.isError).not.toBe(true)
  expect(
    (await client.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'}))
      .structuredContent,
  ).toMatchObject({
    treeState: {expanded: [], visible: true},
  })
})
it('should keep workspace changes and file opening available when tree storage cannot be read', async () => {
  vi.spyOn(console, 'error').mockImplementation(vi.fn())
  mkdirSync(join(home, 'code-viewer'), {recursive: true})
  writeFileSync(join(home, 'code-viewer', 'trees'), 'blocked')
  const client = await connect()
  expect(
    (await client.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'})).isError,
  ).not.toBe(true)
  const changed = await client.callTool({
    _meta: {threadId},
    arguments: {path: selected},
    name: 'code.workspace',
  })
  expect(changed.isError).not.toBe(true)
  expect(changed.structuredContent).toMatchObject({workspace: selected})
  const opened = await client.callTool({
    _meta: {threadId},
    arguments: {path: join(selected, 'notes.txt')},
    name: 'code.open',
  })
  expect(opened.isError).not.toBe(true)
  expect(opened.structuredContent).toMatchObject({document: {source: 'selected folder'}})
})
it('should restore tree state across new sessions and server restarts for only its chat and workspace', async () => {
  const client = await connect()
  const panel = workspaceSessionSchema.parse(
    (await client.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'}))
      .structuredContent,
  )
  const save = (patch: {expanded?: string[]; visible?: boolean}) =>
    client.callTool({
      _meta: {threadId},
      arguments: {patch, session: panel.session},
      name: 'code.tree-state',
    })
  expect(await save({expanded: ['src/deep'], visible: true})).not.toHaveProperty('isError', true)
  expect(await save({expanded: [], visible: false})).not.toHaveProperty('isError', true)
  const restarted = await connect()
  const reopen = await restarted.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'})
  expect(reopen.structuredContent).toMatchObject({treeState: {expanded: [], visible: false}})
  expect(workspaceSessionSchema.parse(reopen.structuredContent).session).not.toBe(panel.session)
  const otherChat = await restarted.callTool({
    _meta: {threadId: other},
    arguments: {},
    name: 'code.panel',
  })
  expect(workspaceSessionSchema.parse(otherChat.structuredContent).treeState).toBeUndefined()
  const changed = await restarted.callTool({
    _meta: {threadId},
    arguments: {path: selected},
    name: 'code.workspace',
  })
  expect(workspaceSessionSchema.parse(changed.structuredContent).treeState).toBeUndefined()
  const back = await restarted.callTool({
    _meta: {threadId},
    arguments: {path: original},
    name: 'code.workspace',
  })
  expect(back.structuredContent).toMatchObject({treeState: {expanded: [], visible: false}})
  const file = await restarted.callTool({
    _meta: {threadId},
    arguments: {path: join(original, 'notes.txt')},
    name: 'code.open',
  })
  expect(file.structuredContent).toMatchObject({
    document: {source: 'original folder'},
    treeState: {expanded: [], visible: false},
  })
  expect(
    await client.callTool({
      arguments: {patch: {visible: true}, session: panel.session},
      name: 'code.tree-state',
    }),
  ).toMatchObject({isError: true, structuredContent: {code: 'thread-unavailable'}})
  expect(
    await client.callTool({
      _meta: {threadId},
      arguments: {patch: {visible: true}, session: 'expired'},
      name: 'code.tree-state',
    }),
  ).toMatchObject({isError: true, structuredContent: {code: 'session-expired'}})
})
it('should restore the saved folder after a server restart and isolate another chat', async () => {
  const client = await connect()
  const result = await client.callTool({
    _meta: {threadId},
    arguments: {path: selected},
    name: 'code.workspace',
  })
  expect(workspaceSessionSchema.parse(result.structuredContent).workspace).toBe(selected)
  const restarted = await connect()
  expect(
    (await restarted.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'}))
      .structuredContent,
  ).toMatchObject({workspace: selected})
  expect(
    (await restarted.callTool({_meta: {threadId: other}, arguments: {}, name: 'code.panel'}))
      .structuredContent,
  ).toMatchObject({workspace: original})
  const opened = await restarted.callTool({
    _meta: {threadId},
    arguments: {path: join(selected, 'notes.txt')},
    name: 'code.open',
  })
  expect(opened.structuredContent).toMatchObject({
    document: {source: 'selected folder'},
    workspace: selected,
  })
  const outside = await restarted.callTool({
    _meta: {threadId},
    arguments: {path: join(original, 'notes.txt')},
    name: 'code.open',
  })
  expect(outside).toMatchObject({isError: true, structuredContent: {code: 'outside-workspace'}})
})
it('should preserve the saved folder after invalid changes and reject missing chat metadata', async () => {
  const client = await connect()
  await client.callTool({_meta: {threadId}, arguments: {path: selected}, name: 'code.workspace'})
  await Promise.all(
    ['relative', join(home, 'missing'), join(selected, 'notes.txt')].map(async (path) => {
      expect(
        await client.callTool({_meta: {threadId}, arguments: {path}, name: 'code.workspace'}),
      ).toMatchObject({isError: true})
    }),
  )
  expect(
    await client.callTool({arguments: {path: original}, name: 'code.workspace'}),
  ).toMatchObject({isError: true, structuredContent: {code: 'thread-unavailable'}})
  expect(
    (await client.callTool({_meta: {threadId}, arguments: {}, name: 'code.panel'}))
      .structuredContent,
  ).toMatchObject({workspace: selected})
})
