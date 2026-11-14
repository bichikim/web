import {mkdtempSync, rmSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, expect, it} from 'vitest'
import {createServer} from '../create-server'
import {createThreadMemos} from '../create-thread-memos'
import {MAX_MEMO_ITEMS, MAX_MEMO_LENGTH} from '../../shared/memo-state'

const home = mkdtempSync(join(tmpdir(), 'viewer-memo-api-'))
const threadId = '01a119e7-be97-7020-930b-7049fb95be38'
const instances: {client: Client; backend: ReturnType<typeof createServer>}[] = []
const connect = async () => {
  const backend = createServer('<html>viewer</html>', {threadMemos: createThreadMemos(home)})
  const client = new Client({name: 'memo-test', version: '1.0.0'})
  const [server, transport] = InMemoryTransport.createLinkedPair()
  await backend.server.connect(server)
  await client.connect(transport)
  instances.push({backend, client})
  return client
}
afterEach(async () => {
  await Promise.all(
    instances.splice(0).map(async ({backend, client}) => {
      await client.close()
      await backend.dispose()
    }),
  )
  rmSync(home, {force: true, recursive: true})
})

it('should accept the bounded maximum and reject excess items or length without changing saved memos', async () => {
  const client = await connect()
  const items = Array.from({length: MAX_MEMO_ITEMS}, () => '가'.repeat(MAX_MEMO_LENGTH))
  const save = await client.callTool({
    _meta: {threadId},
    arguments: {patch: {items}},
    name: 'code.save-memos',
  })
  expect(save.isError).not.toBe(true)
  expect(
    await client.callTool({
      _meta: {threadId},
      arguments: {patch: {items: [...items, '초과']}},
      name: 'code.save-memos',
    }),
  ).toHaveProperty('isError', true)
  expect(
    await client.callTool({
      _meta: {threadId},
      arguments: {patch: {items: ['가'.repeat(MAX_MEMO_LENGTH + 1)]}},
      name: 'code.save-memos',
    }),
  ).toHaveProperty('isError', true)
  expect(
    await client.callTool({_meta: {threadId}, arguments: {}, name: 'code.memos'}),
  ).toMatchObject({
    structuredContent: {items},
  })
})

it('should persist memos without an open file and isolate chat identity at the tool boundary', async () => {
  const client = await connect()
  const save = await client.callTool({
    _meta: {threadId},
    arguments: {patch: {expanded: false, items: ['메모'], visible: true}},
    name: 'code.save-memos',
  })
  expect(save.isError).not.toBe(true)
  const reopened = await connect()
  expect(
    await reopened.callTool({_meta: {threadId}, arguments: {}, name: 'code.memos'}),
  ).toMatchObject({
    structuredContent: {expanded: false, items: ['메모'], visible: true},
  })
  expect(await reopened.callTool({arguments: {}, name: 'code.memos'})).toMatchObject({
    isError: true,
    structuredContent: {code: 'thread-unavailable'},
  })
  expect(
    await reopened.callTool({
      _meta: {threadId: '01a11020-8962-72f1-8735-2a87c41aba83'},
      arguments: {},
      name: 'code.memos',
    }),
  ).toMatchObject({structuredContent: {items: [], visible: false}})
  expect(
    await reopened.callTool({
      _meta: {threadId},
      arguments: {patch: {items: ['']}},
      name: 'code.save-memos',
    }),
  ).toHaveProperty('isError', true)
  expect(
    await reopened.callTool({_meta: {threadId}, arguments: {}, name: 'code.memos'}),
  ).toMatchObject({
    structuredContent: {items: ['메모']},
  })
})
