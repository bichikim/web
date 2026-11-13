import {mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {get} from 'node:http'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createServer} from '../../server/create-server'
import {createBrowserServer} from '../create-browser-server'
import {CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {documentSchema} from '../../shared/contracts'
import {CONTEXT_SEPARATOR, MAX_CONTEXT_BYTES} from '../../shared/context-limits'

describe('createBrowserServer', () => {
  let root: string
  let client: Client
  let backend: ReturnType<typeof createServer>
  let browser: Awaited<ReturnType<typeof createBrowserServer>>
  let address: URL
  let headers: Record<string, string>
  const writeAttachment = vi.fn()
  const composer = vi.fn()
  beforeEach(async () => {
    writeAttachment.mockReset().mockResolvedValue({
      ok: true,
      value: '/private/tmp/code-viewer-attachment-test/code-viewer-context.txt',
    })
    composer.mockReset().mockImplementation(async (_viewer, exportFile) => {
      const file = await exportFile()
      return file.ok ? {ok: true, value: true} : file
    })
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-browser-')))
    writeFileSync(join(root, 'main.ts'), 'export const value = 1\n')
    backend = createServer('<html>viewer</html>', {
      clipboard: {read: vi.fn(), write: vi.fn(), writeAttachment},
      integration: 'standard',
      workspaceRoot: root,
    })
    client = new Client({name: 'Browser test', version: '1.0.0'})
    const [server, transport] = InMemoryTransport.createLinkedPair()
    await backend.server.connect(server)
    await client.connect(transport)
    browser = await createBrowserServer({
      appHtml: '<html lang="ko">app</html>',
      client,
      composer,
      html: '<html>host</html>',
    })
    const opened = await browser.open()
    address = new URL(opened.url)
    headers = {
      Authorization: `Bearer ${new URLSearchParams(address.hash.slice(1)).get('token')}`,
      'Content-Type': 'application/json',
      Origin: address.origin,
    }
  })
  afterEach(async () => {
    await browser.close()
    await client.close()
    await backend.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  const call = async (name: string, input: Record<string, unknown>) =>
    CallToolResultSchema.parse(
      await (
        await fetch(new URL('/tool', address), {
          body: JSON.stringify({arguments: input, name}),
          headers,
          method: 'POST',
        })
      ).json(),
    )

  it('should attach only to its authenticated current session and retain snapshots', async () => {
    const {session, url} = await browser.open()
    await call('code.stage-context', {content: ['unsaved native snapshot'], session})
    expect(await call('code.attach-to-composer', {session})).toMatchObject({
      structuredContent: {attached: true},
    })
    expect(composer).toHaveBeenCalledWith(url, expect.any(Function))
    expect(writeAttachment).toHaveBeenCalledWith('unsaved native snapshot')
    expect(await (await fetch(new URL('/app', address))).text()).toContain(
      'data-composer-attachment="true"',
    )
    expect((await client.listTools()).tools.map(({name}) => name)).not.toContain(
      'code.attach-to-composer',
    )
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'unsaved native snapshot', type: 'text'}],
    })
    const rejected = await fetch(new URL('/tool', address), {
      body: JSON.stringify({
        arguments: {session: 'other-session'},
        name: 'code.attach-to-composer',
      }),
      headers,
      method: 'POST',
    })
    expect(rejected.status).toBe(403)
    expect(composer).toHaveBeenCalledOnce()
  })

  it('should return a native permission failure without exporting or consuming staged content', async () => {
    const {session} = await browser.open()
    await call('code.stage-context', {content: ['retained'], session})
    composer.mockResolvedValueOnce({error: {code: 'composer-permission-required'}, ok: false})
    expect(await call('code.attach-to-composer', {session})).toMatchObject({
      isError: true,
      structuredContent: {code: 'composer-permission-required'},
    })
    expect(writeAttachment).not.toHaveBeenCalled()
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'retained', type: 'text'}],
    })
  })

  it.each(['relative', 'absolute'])(
    'should export only the requested file with its original name and bytes for %s input',
    async (input) => {
      const {session} = await browser.open()
      const bytes = Buffer.from([0, 1, 255, 10])
      writeFileSync(join(root, '선택한 파일.png'), bytes)
      await call('code.stage-context', {content: ['unrelated retained snapshot'], session})
      expect(
        await call('code.attach-to-composer', {
          attachment: {
            kind: 'file',
            path: input === 'relative' ? '선택한 파일.png' : join(root, '선택한 파일.png'),
          },
          session,
        }),
      ).toMatchObject({structuredContent: {attached: true}})
      expect(writeAttachment).toHaveBeenCalledExactlyOnceWith(bytes, '선택한 파일.png')
      expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject(
        {
          content: [{text: 'unrelated retained snapshot', type: 'text'}],
        },
      )
    },
  )

  it('should preserve a named text snapshot through the native attachment boundary', async () => {
    const {session} = await browser.open()
    await call('code.stage-context', {content: ['unrelated pending'], session})
    expect(
      await call('code.attach-to-composer', {
        attachment: {filename: 'main.ts.selection.txt', kind: 'text', text: 'selected only'},
        session,
      }),
    ).toMatchObject({structuredContent: {attached: true}})
    expect(writeAttachment).toHaveBeenCalledExactlyOnceWith(
      'selected only',
      'main.ts.selection.txt',
    )
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'unrelated pending', type: 'text'}],
    })
  })

  it('should reject a file outside the workspace without exporting it', async () => {
    const {session} = await browser.open()
    expect(
      await call('code.attach-to-composer', {
        attachment: {kind: 'file', path: join(root, '../private.txt')},
        session,
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'outside-workspace'}})
    expect(writeAttachment).not.toHaveBeenCalled()
  })

  it('should export retained snapshots only through the authenticated app clipboard tool', async () => {
    const {session} = await browser.open()
    const content = ['unsaved 한국어🙂', 'second selection']
    await call('code.stage-context', {content, session})
    expect(await call('code.copy-attachments', {session})).toMatchObject({
      structuredContent: {copied: true},
    })
    expect(writeAttachment).toHaveBeenCalledWith(content.join('\n\n---\n\n'))
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: content.map((text) => ({text, type: 'text'})),
    })
    expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe('export const value = 1\n')
    expect(await (await fetch(new URL('/app', address))).text()).toContain(
      'data-file-clipboard="true"',
    )
    expect(
      (
        await fetch(new URL('/tool', address), {
          body: JSON.stringify({arguments: {session}, name: 'code.copy-attachments'}),
          method: 'POST',
        })
      ).status,
    ).toBe(403)
  })

  it('should reject an empty copy and retain snapshots after clipboard rejection', async () => {
    const {session} = await browser.open()
    expect(await call('code.copy-attachments', {session})).toMatchObject({isError: true})
    expect(writeAttachment).not.toHaveBeenCalled()
    await call('code.stage-context', {content: ['retained draft'], session})
    writeAttachment.mockResolvedValueOnce({error: {code: 'clipboard-unavailable'}, ok: false})
    expect(await call('code.copy-attachments', {session})).toMatchObject({
      isError: true,
      structuredContent: {code: 'clipboard-unavailable'},
    })
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'retained draft', type: 'text'}],
    })
  })

  it('should reject staged content whose native file separators exceed the export limit', async () => {
    const {session} = await browser.open()
    await call('code.stage-context', {content: ['previous'], session})
    expect(
      await call('code.stage-context', {
        content: ['x'.repeat(MAX_CONTEXT_BYTES - 2), 'y'],
        session,
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'context-too-large'}})
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'previous', type: 'text'}],
    })
  })

  it('should copy staged snapshots at exactly the native export byte limit', async () => {
    const {session} = await browser.open()
    const content = ['x'.repeat(MAX_CONTEXT_BYTES - CONTEXT_SEPARATOR.length - 1), 'y']
    expect(await call('code.stage-context', {content, session})).toMatchObject({
      structuredContent: {count: 2},
    })
    expect(await call('code.copy-attachments', {session})).toMatchObject({
      structuredContent: {copied: true},
    })
    expect(writeAttachment).toHaveBeenCalledWith(content.join(CONTEXT_SEPARATOR))
    expect(Buffer.byteLength(content.join(CONTEXT_SEPARATOR))).toBe(MAX_CONTEXT_BYTES)
  })

  it('should reuse one viewer session and serve its initial connection', async () => {
    const opened = await browser.open()
    expect(opened.url).toBe(address.href)
    expect(opened.workspace).toBe(root)
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      structuredContent: {session: opened.session, workspace: root},
    })
    expect(await (await fetch(address)).text()).toBe('<html>host</html>')
    expect(await call('code.open', {path: join(root, 'main.ts')})).toMatchObject({
      structuredContent: {
        document: {location: {path: 'main.ts'}},
        session: opened.session,
        workspace: root,
      },
    })
    await call('code.close', {session: opened.session})
    expect(await call('code.read', {path: 'main.ts', session: opened.session})).not.toHaveProperty(
      'isError',
      true,
    )
  })
  it('should save source with revision checks and expose unsaved attachments to the model client', async () => {
    const {session} = await browser.open()
    const read = await call('code.read', {path: 'main.ts', session})
    const document = documentSchema.parse(read.structuredContent?.document)
    const source = 'export const value = 42\n'
    expect(
      await call('code.write', {path: 'main.ts', revision: document.revision, session, source}),
    ).not.toHaveProperty('isError', true)
    expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe(source)
    expect(
      await call('code.write', {
        path: 'main.ts',
        revision: document.revision,
        session,
        source: 'stale',
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'write-conflict'}})
    await call('code.stage-context', {content: ['unsaved browser snapshot'], session})
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: [{text: 'unsaved browser snapshot', type: 'text'}],
    })
    expect(readFileSync(join(root, 'main.ts'), 'utf8')).toBe(source)
    await call('code.stage-context', {content: [], session})
    expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject({
      content: [],
    })
  })
  it('should open a requested project location before the Browser connects', async () => {
    writeFileSync(join(root, 'target.ts'), 'export const first = 1\nexport const second = 2\n')
    const {session} = await browser.open()
    expect(
      await browser.navigate({column: 8, line: 2, path: join(root, 'target.ts')}),
    ).toMatchObject({
      structuredContent: {document: {location: {column: 8, line: 2, path: 'target.ts'}}, session},
    })
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      structuredContent: {document: {location: {column: 8, line: 2, path: 'target.ts'}}},
    })
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      _meta: {'winter-love/code-viewer/navigation': {restoreView: false}},
    })
    expect(await browser.open()).toMatchObject({session, url: address.href})
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      _meta: {'winter-love/code-viewer/navigation': {restoreView: true}},
    })
  })
  it('should publish repeated file navigation without replacing the session or attachments', async () => {
    const controller = new AbortController()
    const response = await fetch(new URL('/events', address), {headers, signal: controller.signal})
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
    try {
      await reader.read()
      const {session} = await browser.open()
      await call('code.stage-context', {content: ['retained draft snapshot'], session})
      await browser.navigate({column: 1, line: 1, path: 'main.ts'})
      expect(JSON.parse((await reader.read()).value!.trim())).toMatchObject({
        structuredContent: {document: {location: {path: 'main.ts'}}, session},
      })
      await browser.navigate({column: 8, line: 1, path: 'main.ts'})
      expect(JSON.parse((await reader.read()).value!.trim())).toMatchObject({
        structuredContent: {document: {location: {column: 8}}, session},
      })
      expect(await client.callTool({arguments: {session}, name: 'code.attachments'})).toMatchObject(
        {
          content: [{text: 'retained draft snapshot', type: 'text'}],
        },
      )
    } finally {
      controller.abort()
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
  })
  it('should retain the current location when the requested file is missing or outside the project', async () => {
    await browser.navigate({column: 1, line: 1, path: 'main.ts'})
    for (const path of ['missing.ts', '../outside.ts', join(root, '..', 'outside.ts')]) {
      // oxlint-disable-next-line no-await-in-loop -- Each failed navigation must leave the last successful location intact.
      expect(await browser.navigate({column: 1, line: 1, path})).toMatchObject({isError: true})
    }
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      structuredContent: {document: {location: {path: 'main.ts'}}},
    })
    expect((await fetch(new URL('/events', address))).status).toBe(403)
  })
  it('should retain the user viewed file across reconnects without broadcasting another navigation', async () => {
    writeFileSync(join(root, 'user.ts'), 'const user = 1\n')
    await browser.navigate({column: 8, line: 1, path: 'main.ts'})
    const remember = (input: object, authenticated = true) =>
      fetch(new URL('/location', address), {
        body: JSON.stringify(input),
        headers: authenticated ? headers : {},
        method: 'POST',
      })
    expect((await remember({path: 'user.ts', workspace: root})).status).toBe(200)
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      _meta: {'winter-love/code-viewer/navigation': {restoreView: true}},
      structuredContent: {document: {location: {path: 'user.ts'}}},
    })
    expect((await remember({path: '../outside.ts', workspace: root})).status).toBe(400)
    expect((await remember({path: 'main.ts', workspace: '/other'})).status).toBe(403)
    expect((await remember({path: 'main.ts', workspace: root}, false)).status).toBe(403)
    expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
      structuredContent: {document: {location: {path: 'user.ts'}}},
    })
  })

  it('should retain the latest viewed file when earlier location reads finish later', async () => {
    writeFileSync(join(root, 'user.ts'), 'const user = 1\n')
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const original = client.callTool.bind(client)
    const read = vi.spyOn(client, 'callTool').mockImplementationOnce(async (...args) => {
      const result = await original(...args)
      started.resolve()
      await release.promise
      return result
    })
    const pending = fetch(new URL('/location', address), {
      body: JSON.stringify({path: 'user.ts', workspace: root}),
      headers,
      method: 'POST',
    })
    try {
      await started.promise
      await browser.navigate({column: 1, line: 1, path: 'main.ts'})
      release.resolve()
      expect((await pending).status).toBe(200)
      expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
        structuredContent: {document: {location: {path: 'main.ts'}}},
      })
    } finally {
      release.resolve()
      await pending
      read.mockRestore()
    }
  })

  it('should retain a completed location when a later navigation fails', async () => {
    writeFileSync(join(root, 'user.ts'), 'const user = 1\n')
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const original = client.callTool.bind(client)
    const read = vi.spyOn(client, 'callTool').mockImplementationOnce(async (...args) => {
      const result = await original(...args)
      started.resolve()
      await release.promise
      return result
    })
    const pending = fetch(new URL('/location', address), {
      body: JSON.stringify({path: 'user.ts', workspace: root}),
      headers,
      method: 'POST',
    })
    try {
      await started.promise
      expect(await browser.navigate({column: 1, line: 1, path: 'missing.ts'})).toMatchObject({
        isError: true,
      })
      release.resolve()
      expect((await pending).status).toBe(200)
      expect(await (await fetch(new URL('/initial', address), {headers})).json()).toMatchObject({
        structuredContent: {document: {location: {path: 'user.ts'}}},
      })
    } finally {
      release.resolve()
      await pending
      read.mockRestore()
    }
  })

  it('should not broadcast an obsolete navigation after a later viewed-file update', async () => {
    writeFileSync(join(root, 'user.ts'), 'const user = 1\n')
    const controller = new AbortController()
    const response = await fetch(new URL('/events', address), {headers, signal: controller.signal})
    const reader = response.body!.pipeThrough(new TextDecoderStream()).getReader()
    const started = Promise.withResolvers<void>()
    const release = Promise.withResolvers<void>()
    const original = client.callTool.bind(client)
    const read = vi.spyOn(client, 'callTool').mockImplementationOnce(async (...args) => {
      const result = await original(...args)
      started.resolve()
      await release.promise
      return result
    })
    const pending = browser.navigate({column: 1, line: 1, path: 'main.ts'})
    try {
      await reader.read()
      await started.promise
      expect(
        (
          await fetch(new URL('/location', address), {
            body: JSON.stringify({path: 'user.ts', workspace: root}),
            headers,
            method: 'POST',
          })
        ).status,
      ).toBe(200)
      release.resolve()
      await pending
      await browser.navigate({column: 2, line: 1, path: 'user.ts'})
      expect(JSON.parse((await reader.read()).value!.trim())).toMatchObject({
        structuredContent: {document: {location: {column: 2, path: 'user.ts'}}},
      })
    } finally {
      release.resolve()
      await pending
      read.mockRestore()
      controller.abort()
      await reader.cancel().catch(() => undefined)
      reader.releaseLock()
    }
  })
  it('should reject unauthenticated, foreign-origin, invalid-host and unrelated-session requests', async () => {
    expect((await fetch(new URL('/initial', address))).status).toBe(403)
    expect(
      (
        await fetch(new URL('/initial', address), {
          headers: {...headers, Authorization: 'Bearer wrong'},
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await fetch(new URL('/initial', address), {
          headers: {...headers, Origin: 'https://foreign.invalid'},
        })
      ).status,
    ).toBe(403)
    const foreignHost = await new Promise<number | undefined>((resolve, reject) => {
      get(address, {headers: {Host: 'foreign.invalid'}}, (response) => {
        response.resume()
        resolve(response.statusCode)
      }).once('error', reject)
    })
    expect(foreignHost).toBe(403)
    expect(
      (
        await fetch(new URL('/tool', address), {
          body: JSON.stringify({
            arguments: {path: 'main.ts', session: 'another'},
            name: 'code.read',
          }),
          headers,
          method: 'POST',
        })
      ).status,
    ).toBe(403)
    expect(
      (
        await fetch(new URL('/tool', address), {
          body: JSON.stringify({arguments: {}, name: 'unknown.tool'}),
          headers,
          method: 'POST',
        })
      ).status,
    ).toBe(403)
    expect(
      await call('code.read', {path: '../outside.ts', session: (await browser.open()).session}),
    ).toMatchObject({isError: true})
  })
  it('should reject malformed and oversized requests without damaging the connection', async () => {
    expect(
      (await fetch(new URL('/tool', address), {body: '{', headers, method: 'POST'})).status,
    ).toBe(400)
    expect(
      (
        await fetch(new URL('/tool', address), {
          body: JSON.stringify({
            arguments: {content: 'x'.repeat(8_388_609)},
            name: 'code.stage-context',
          }),
          headers,
          method: 'POST',
        })
      ).status,
    ).toBe(413)
    expect((await fetch(new URL('/initial', address), {headers})).status).toBe(200)
  })
})
