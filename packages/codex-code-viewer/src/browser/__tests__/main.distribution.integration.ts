import {mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {fileURLToPath} from 'node:url'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {StdioClientTransport} from '@modelcontextprotocol/sdk/client/stdio.js'
import {CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {expect, it} from 'vitest'
import {connectionSchema, documentSchema} from '../../shared/contracts'
import {z} from 'zod'

it('should connect the built Browser UI and model attachment tool to one file-editing session', async () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'browser-distribution-')))
  const path = join(root, 'main.ts')
  writeFileSync(path, 'export const answer = 1\n')
  const client = new Client({name: 'Browser distribution test', version: '1.0.0'})
  const transport = new StdioClientTransport({
    args: [fileURLToPath(new URL('../../../dist/browser.js', import.meta.url)), root],
    command: process.execPath,
    stderr: 'pipe',
  })
  try {
    await client.connect(transport)
    expect((await client.listTools()).tools.map(({name}) => name)).toEqual([
      'code.browser',
      'code.attachments',
    ])
    expect((await client.listPrompts()).prompts).toMatchObject([{name: 'open-code-viewer'}])
    expect(await client.getPrompt({name: 'open-code-viewer'})).toMatchObject({
      messages: [
        {content: {text: expect.stringContaining('code.browser'), type: 'text'}, role: 'user'},
      ],
    })
    const opened = await client.callTool({arguments: {}, name: 'code.browser'})
    const {url} = z.object({url: z.url()}).parse(opened.structuredContent)
    const address = new URL(url)
    const headers = {
      Authorization: `Bearer ${new URLSearchParams(address.hash.slice(1)).get('token')}`,
      'Content-Type': 'application/json',
    }
    const initial = CallToolResultSchema.parse(
      await (await fetch(new URL('/initial', url), {headers})).json(),
    )
    const {session} = connectionSchema.parse(initial.structuredContent)
    const call = async (name: string, input: Record<string, unknown>) =>
      CallToolResultSchema.parse(
        await (
          await fetch(new URL('/tool', url), {
            body: JSON.stringify({arguments: input, name}),
            headers,
            method: 'POST',
          })
        ).json(),
      )
    const read = await call('code.read', {path: 'main.ts', session})
    const document = documentSchema.parse(read.structuredContent?.document)
    await call('code.write', {
      path: 'main.ts',
      revision: document.revision,
      session,
      source: 'export const answer = 42\n',
    })
    expect(readFileSync(path, 'utf8')).toBe('export const answer = 42\n')
    await call('code.stage-context', {content: ['BROWSER_UNSAVED_ATTACHMENT'], session})
    expect(await client.callTool({arguments: {}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'BROWSER_UNSAVED_ATTACHMENT', type: 'text'}],
    })
    expect(await client.callTool({arguments: {}, name: 'code.browser'})).toMatchObject({
      structuredContent: {session, url},
    })
    expect(
      await client.callTool({
        arguments: {column: 8, line: 1, path: 'main.ts'},
        name: 'code.browser',
      }),
    ).toMatchObject({
      structuredContent: {location: {column: 8, line: 1, path: 'main.ts'}, session, url},
    })
    expect(await (await fetch(new URL('/initial', url), {headers})).json()).toMatchObject({
      structuredContent: {document: {location: {column: 8, line: 1, path: 'main.ts'}}, session},
    })
    expect(await client.callTool({arguments: {}, name: 'code.browser'})).not.toHaveProperty(
      'structuredContent.document',
    )
    expect(
      await client.callTool({arguments: {path: '../outside.ts'}, name: 'code.browser'}),
    ).toMatchObject({isError: true})
    expect(await client.callTool({arguments: {line: 2}, name: 'code.browser'})).toMatchObject({
      isError: true,
    })
    expect(
      await client.callTool({arguments: {line: 0, path: 'main.ts'}, name: 'code.browser'}),
    ).toMatchObject({isError: true})
    expect(await client.callTool({arguments: {}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'BROWSER_UNSAVED_ATTACHMENT', type: 'text'}],
    })
    await call('code.stage-context', {content: [], session})
    expect(await client.callTool({arguments: {}, name: 'code.attachments'})).toMatchObject({
      content: [],
    })
  } finally {
    await client.close()
    rmSync(root, {force: true, recursive: true})
  }
})
