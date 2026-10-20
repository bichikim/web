import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, expect, it} from 'vitest'
import {success, workspaceSessionSchema} from '../../shared/contracts'
import {createServer} from '../create-server'
import {createThreadWorkspaces} from '../create-thread-workspaces'

const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
const other = '01a11020-8962-72f1-8735-2a87c41aba83'
let home: string
let original: string
let selected: string
const connections: {client: Client; instance: ReturnType<typeof createServer>}[] = []
const connect = async () => {
  const instance = createServer('<html>viewer</html>', {
    threadWorkspaces: createThreadWorkspaces(home),
    workspace: () => success(original),
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
  await Promise.all(
    connections.splice(0).map(async ({client, instance}) => {
      await client.close()
      await instance.dispose()
    }),
  )
  rmSync(home, {force: true, recursive: true})
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
