import {mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {expect, it} from 'vitest'
import {z} from 'zod'
import {navigationResultSchema, sessionSchema, streamEndpointSchema} from '../../shared/contracts'
import {createServer} from '../create-server'

it('should stream discovered file groups over MCP and complete all twenty thousand usages', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-mcp-many-files-')))
  const instance = createServer('<html>viewer</html>')
  const client = new Client({name: 'mcp-many-files-test', version: '1.0.0'})
  const [server, transport] = InMemoryTransport.createLinkedPair()
  try {
    await instance.server.connect(server)
    await client.connect(transport)
    writeFileSync(join(root, 'tsconfig.json'), '{"compilerOptions":{"noLib":true,"types":[]}}')
    writeFileSync(join(root, 'helper.ts'), 'export const fanOut = (value: number) => value\n')
    mkdirSync(join(root, 'callers'))
    const paths = Array.from(
      {length: 10000},
      (_, index) => `callers/caller-${String(index).padStart(5, '0')}.ts`,
    )
    paths.forEach((path, index) =>
      writeFileSync(join(root, path), `import {fanOut} from '../helper'\nfanOut(${index})\n`),
    )
    const opened = sessionSchema.parse(
      (await client.callTool({arguments: {path: join(root, 'helper.ts')}, name: 'code.open'}))
        .structuredContent,
    )
    const started = Date.now()
    const {url} = streamEndpointSchema.parse(
      (
        await client.callTool({
          arguments: {
            navigation: 'definition',
            offset: 13,
            path: 'helper.ts',
            revision: opened.document.revision,
            session: opened.session,
            stream: true,
            transport: 'mcp',
          },
          name: 'code.navigate',
        })
      ).structuredContent,
    )
    const schema = z.discriminatedUnion('done', [
      z.object({done: z.literal(true)}),
      z.object({batch: navigationResultSchema, done: z.literal(false)}),
    ])
    const first = schema.parse(
      (await client.callTool({arguments: {url}, name: 'code.stream.read'})).structuredContent,
    )
    const firstMilliseconds = Date.now() - started
    expect(first.done).toBe(false)
    if (first.done) {
      throw new Error('First batch missing')
    }
    expect(first.batch.groups?.length).toBeGreaterThan(0)
    expect(first.batch.groups?.length).toBeLessThan(paths.length)
    expect(first.batch.locations).toEqual([])
    let groups = first.batch.groups
    const locations = [...first.batch.locations]
    let batches = 1
    let complete = false
    while (!complete) {
      // oxlint-disable-next-line no-await-in-loop -- Consume the MCP cursor in request order.
      const response = await client.callTool({arguments: {url}, name: 'code.stream.read'})
      const next = schema.parse(response.structuredContent)
      complete = next.done
      if (!next.done) {
        groups = next.batch.groups ?? groups
        locations.push(...next.batch.locations)
        batches += 1
      }
    }
    expect(groups).toEqual(paths.map((path) => ({count: 2, path})))
    expect(
      locations.sort(
        (left, right) =>
          left.path.localeCompare(right.path) ||
          left.line - right.line ||
          left.column - right.column,
      ),
    ).toEqual(
      paths.flatMap((path, index) => [
        {column: 9, line: 1, path, preview: `import {fanOut} from '../helper'\nfanOut(${index})`},
        {column: 1, line: 2, path, preview: `fanOut(${index})`},
      ]),
    )
    expect(batches).toBeGreaterThan(1)
    console.info(
      JSON.stringify({
        batches,
        firstMilliseconds: Math.round(firstMilliseconds),
        totalMilliseconds: Math.round(Date.now() - started),
        usages: locations.length,
      }),
    )
  } finally {
    await client.close()
    await instance.dispose()
    rmSync(root, {force: true, recursive: true})
  }
})
