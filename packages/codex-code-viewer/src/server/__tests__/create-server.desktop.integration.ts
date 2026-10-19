import {
  copyFileSync,
  mkdirSync,
  mkdtempSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {createServer} from '../create-server'
import {sessionSchema, success} from '../../shared/contracts'

describe('createServer desktop', () => {
  let root: string
  let workspace: string
  let client: Client
  let instance: ReturnType<typeof createServer>
  beforeEach(async () => {
    root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-desktop-')))
    workspace = join(root, 'project', 'src')
    mkdirSync(workspace, {recursive: true})
    mkdirSync(join(root, 'project', '.git'))
    writeFileSync(join(workspace, 'main.ts'), 'export const answer = 42\n')
    writeFileSync(join(root, 'project', 'private.ts'), 'private parent\n')
    instance = createServer('<html>viewer</html>', {
      integration: 'standard',
      workspaceRoot: workspace,
    })
    client = new Client({name: 'Claude Desktop test', version: '1.0.0'})
    const [server, transport] = InMemoryTransport.createLinkedPair()
    await instance.server.connect(server)
    await client.connect(transport)
  })
  afterEach(async () => {
    await client.close()
    await instance.dispose()
    rmSync(root, {force: true, recursive: true})
  })
  it('should render PDF pages with the existing PDF.js runtime and reject invalid locations', async () => {
    copyFileSync(join(import.meta.dirname, 'fixtures/pdf/pages.pdf'), join(workspace, 'pages.pdf'))
    const opened = sessionSchema.parse(
      (await client.callTool({arguments: {path: 'pages.pdf'}, name: 'code.open'}))
        .structuredContent,
    )
    const args = {path: 'pages.pdf', revision: opened.document.revision, session: opened.session}
    const first = await client.callTool({arguments: {...args, page: 1}, name: 'code.pdfPreview'})
    expect(first.structuredContent).toMatchObject({
      height: 500,
      kind: 'pdf',
      page: 1,
      pages: 2,
      text: 'Code Viewer PDF page one',
      width: 400,
    })
    const firstPreview = first.structuredContent as {uri: string}
    expect(firstPreview.uri).toMatch(/^data:image\/jpeg;base64,/u)
    const second = await client.callTool({arguments: {...args, page: 2}, name: 'code.pdfPreview'})
    expect(second.structuredContent).toMatchObject({page: 2, text: 'Code Viewer PDF page two'})
    expect((second.structuredContent as {uri: string}).uri).not.toBe(firstPreview.uri)
    const invalid = await client.callTool({arguments: {...args, page: 3}, name: 'code.pdfPreview'})
    expect(invalid.isError).toBe(true)
    const stale = await client.callTool({
      arguments: {...args, page: 1, revision: 'old'},
      name: 'code.pdfPreview',
    })
    expect(stale.isError).toBe(true)
    const outside = await client.callTool({
      arguments: {...args, page: 1, path: '../private.pdf'},
      name: 'code.pdfPreview',
    })
    expect(outside.isError).toBe(true)
  })
  it('should preview XLSX sheets and DOCX nodes through the connected workspace', async () => {
    const fixture = join(import.meta.dirname, '../../viewer/office/__tests__/fixtures')
    copyFileSync(join(fixture, 'workbook.xlsx'), join(workspace, 'workbook.xlsx'))
    copyFileSync(join(fixture, 'document.docx'), join(workspace, 'document.docx'))
    const opened = sessionSchema.parse(
      (await client.callTool({arguments: {path: 'workbook.xlsx'}, name: 'code.open'}))
        .structuredContent,
    )
    const spreadsheet = await client.callTool({
      arguments: {
        path: 'workbook.xlsx',
        revision: opened.document.revision,
        session: opened.session,
      },
      name: 'code.documentPreview',
    })
    expect(spreadsheet.structuredContent).toMatchObject({
      document: {
        ok: true,
        sheets: expect.arrayContaining([expect.objectContaining({rows: expect.any(Array)})]),
      },
      kind: 'spreadsheet',
    })
    const word = sessionSchema.parse(
      (
        await client.callTool({
          arguments: {path: 'document.docx', session: opened.session},
          name: 'code.open',
        })
      ).structuredContent,
    )
    const document = await client.callTool({
      arguments: {path: 'document.docx', revision: word.document.revision, session: opened.session},
      name: 'code.documentPreview',
    })
    expect(document.structuredContent).toMatchObject({
      document: {nodes: expect.arrayContaining([expect.objectContaining({tag: 'h1'})]), ok: true},
      kind: 'word',
    })
    expect(JSON.stringify(document.structuredContent)).toContain('한글 보고서')
  })
  it('should reject stale office revisions, outside paths and expired sessions', async () => {
    copyFileSync(
      join(import.meta.dirname, '../../viewer/office/__tests__/fixtures/workbook.xlsx'),
      join(workspace, 'workbook.xlsx'),
    )
    const opened = sessionSchema.parse(
      (await client.callTool({arguments: {path: 'workbook.xlsx'}, name: 'code.open'}))
        .structuredContent,
    )
    const call = (path: string, revision: string, session = opened.session) =>
      client.callTool({arguments: {path, revision, session}, name: 'code.documentPreview'})
    expect(await call('workbook.xlsx', 'old')).toMatchObject({
      isError: true,
      structuredContent: {code: 'stale-document'},
    })
    expect(await call('../private.ts', opened.document.revision)).toMatchObject({
      isError: true,
      structuredContent: {code: 'outside-workspace'},
    })
    expect(await call('workbook.xlsx', opened.document.revision, 'expired')).toMatchObject({
      isError: true,
      structuredContent: {code: 'session-expired'},
    })
  })
  it('should resolve real Desktop identifiers to definitions and unsaved usages', async () => {
    const helper = 'export const paneGreeting = (name: string) => name\n'
    const caller = "import {paneGreeting} from './greeting'\npaneGreeting('first')\n"
    const other = "import {paneGreeting} from './greeting'\npaneGreeting('second')\n"
    writeFileSync(join(workspace, 'greeting.ts'), helper)
    writeFileSync(join(workspace, 'main.ts'), caller)
    writeFileSync(join(workspace, 'other.ts'), other)
    const opened = sessionSchema.parse(
      (
        await client.callTool({
          arguments: {path: 'main.ts'},
          name: 'code.open',
        })
      ).structuredContent,
    )
    const source = opened.document
    const highlight = await client.callTool({
      arguments: {path: 'main.ts', session: opened.session, source: caller},
      name: 'code.highlight',
    })
    expect(highlight.structuredContent).toMatchObject({
      lines: expect.arrayContaining([
        expect.arrayContaining([
          expect.objectContaining({navigation: 'definition', text: 'paneGreeting'}),
        ]),
      ]),
    })
    const definition = await client.callTool({
      arguments: {
        navigation: 'definition',
        offset: caller.lastIndexOf('paneGreeting'),
        path: 'main.ts',
        revision: source.revision,
        session: opened.session,
      },
      name: 'code.navigate',
    })
    expect(definition.structuredContent).toMatchObject({
      kind: 'definition',
      locations: [{column: 14, line: 1, path: 'greeting.ts'}],
    })
    const target = sessionSchema.parse(
      (
        await client.callTool({
          arguments: {
            path: 'greeting.ts',
            session: opened.session,
          },
          name: 'code.open',
        })
      ).structuredContent,
    )
    const draft = caller.replace('\npaneGreeting', '\n\npaneGreeting')
    const usages = await client.callTool({
      arguments: {
        navigation: 'definition',
        offset: helper.indexOf('paneGreeting'),
        path: 'greeting.ts',
        revision: target.document.revision,
        session: opened.session,
        sources: [{path: 'main.ts', source: draft}],
      },
      name: 'code.navigate',
    })
    expect(usages.structuredContent).toMatchObject({
      kind: 'references',
      locations: expect.arrayContaining([
        expect.objectContaining({column: 1, line: 3, path: 'main.ts'}),
        expect.objectContaining({column: 1, line: 2, path: 'other.ts'}),
      ]),
    })
  })
  it('should expose standard UI entry tools without Codex entrypoints', async () => {
    const {tools} = await client.listTools()
    expect(tools.map(({name}) => name)).not.toContain('code.file')
    expect(tools.map(({name}) => name)).not.toContain('code.attach')
    const panel = tools.find(({name}) => name === 'code.panel')
    expect(panel?._meta).toEqual({ui: {resourceUri: expect.stringMatching(/^ui:\/\//u)}})
    expect(await client.callTool({arguments: {}, name: 'code.panel'})).toMatchObject({
      structuredContent: {workspace},
    })
  })
  it('should keep clipboard tools app-only and require the connected workspace session', async () => {
    await client.close()
    await instance.dispose()
    const read = vi.fn(async () => success('pasted\ntext'))
    const write = vi.fn(async (_text: string) => success(true))
    instance = createServer('<html>viewer</html>', {
      clipboard: {read, write},
      integration: 'standard',
      workspaceRoot: workspace,
    })
    client = new Client({name: 'Clipboard boundary test', version: '1.0.0'})
    const [server, transport] = InMemoryTransport.createLinkedPair()
    await instance.server.connect(server)
    await client.connect(transport)
    const {session} = sessionSchema.parse(
      (await client.callTool({arguments: {path: 'main.ts'}, name: 'code.open'})).structuredContent,
    )
    expect(read).not.toHaveBeenCalled()
    expect(
      await client.callTool({arguments: {path: '../private.ts', session}, name: 'code.paste'}),
    ).toMatchObject({isError: true})
    expect(
      await client.callTool({arguments: {path: 'main.ts', session: 'unknown'}, name: 'code.paste'}),
    ).toMatchObject({isError: true})
    expect(read).not.toHaveBeenCalled()
    expect(
      await client.callTool({arguments: {path: 'main.ts', session}, name: 'code.paste'}),
    ).toMatchObject({structuredContent: {text: 'pasted\ntext'}})
    expect(
      await client.callTool({
        arguments: {path: 'main.ts', session, text: 'selected snapshot'},
        name: 'code.copy',
      }),
    ).toMatchObject({structuredContent: {copied: true}})
    expect(write).toHaveBeenCalledWith('selected snapshot')
    expect(
      (await client.listTools()).tools.find((tool) => tool.name === 'code.paste')?._meta,
    ).toEqual({ui: {visibility: ['app']}})
  })
  it('should highlight draft source without writing it and require an active session', async () => {
    const opened = sessionSchema.parse(
      (await client.callTool({arguments: {path: 'main.ts'}, name: 'code.open'})).structuredContent,
    )
    expect(
      await client.callTool({
        arguments: {
          path: 'main.ts',
          session: opened.session,
          source: 'export const draft = "unsaved"',
        },
        name: 'code.highlight',
      }),
    ).toMatchObject({
      structuredContent: {
        lines: [
          expect.arrayContaining([
            expect.objectContaining({kind: 'keyword', text: 'export'}),
            expect.objectContaining({kind: 'string', text: '"unsaved"'}),
          ]),
        ],
      },
    })
    expect(
      await client.callTool({
        arguments: {path: 'main.ts', session: 'unknown', source: 'draft'},
        name: 'code.highlight',
      }),
    ).toMatchObject({isError: true})
    expect(
      (await client.callTool({arguments: {path: 'main.ts'}, name: 'code.open'})).structuredContent,
    ).toMatchObject({document: {source: 'export const answer = 42\n'}})
    expect(
      (await client.listTools()).tools.find((tool) => tool.name === 'code.highlight')?._meta,
    ).toEqual({ui: {visibility: ['app']}})
  })
  it('should keep the selected folder as root even inside a larger repository', async () => {
    const opened = await client.callTool({
      arguments: {path: join(workspace, 'main.ts')},
      name: 'code.open',
    })
    expect(sessionSchema.parse(opened.structuredContent)).toMatchObject({
      document: {source: 'export const answer = 42\n'},
      workspace,
    })
    expect(
      await client.callTool({
        arguments: {path: join(root, 'project', 'private.ts')},
        name: 'code.open',
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'outside-workspace'}})
  })
  it('should reject symlink escapes and private entries', async () => {
    symlinkSync(join(root, 'project', 'private.ts'), join(workspace, 'linked.ts'))
    mkdirSync(join(workspace, '.ssh'))
    writeFileSync(join(workspace, '.ssh', 'secret.ts'), 'secret')
    for (const path of ['linked.ts', '.ssh/secret.ts', '../private.ts']) {
      // oxlint-disable-next-line no-await-in-loop -- Each path exercises the same server boundary.
      expect(await client.callTool({arguments: {path}, name: 'code.open'})).toMatchObject({
        isError: true,
      })
    }
  })
  it('should return bounded source text for model-visible file context', async () => {
    const result = await client.callTool({arguments: {path: 'main.ts'}, name: 'code.context'})
    expect(result.content).toEqual([
      {text: expect.stringContaining('export const answer = 42'), type: 'text'},
    ])
    expect(
      await client.callTool({arguments: {path: '../private.ts'}, name: 'code.context'}),
    ).toMatchObject({isError: true})
  })
  it('should isolate unsaved attachment snapshots by session and clear them on close', async () => {
    const first = sessionSchema.parse(
      (await client.callTool({arguments: {path: 'main.ts'}, name: 'code.open'})).structuredContent,
    )
    const second = sessionSchema.parse(
      (await client.callTool({arguments: {path: 'main.ts'}, name: 'code.open'})).structuredContent,
    )
    const content = ['unsaved snapshot missing from disk']
    expect(
      await client.callTool({
        arguments: {content, session: first.session},
        name: 'code.stage-context',
      }),
    ).toMatchObject({structuredContent: {count: 1}})
    expect(
      await client.callTool({arguments: {session: first.session}, name: 'code.attachments'}),
    ).toMatchObject({content: [{text: content[0], type: 'text'}]})
    expect(
      await client.callTool({arguments: {session: second.session}, name: 'code.attachments'}),
    ).toMatchObject({content: []})
    expect(
      await client.callTool({
        arguments: {content: ['가'.repeat(30_000)], session: first.session},
        name: 'code.stage-context',
      }),
    ).toMatchObject({isError: true, structuredContent: {code: 'context-too-large'}})
    expect(
      await client.callTool({arguments: {session: first.session}, name: 'code.attachments'}),
    ).toMatchObject({content: [{text: content[0], type: 'text'}]})
    await client.callTool({
      arguments: {content: [], session: first.session},
      name: 'code.stage-context',
    })
    expect(
      await client.callTool({arguments: {session: first.session}, name: 'code.attachments'}),
    ).toMatchObject({content: []})
    await client.callTool({arguments: {session: first.session}, name: 'code.close'})
    expect(
      await client.callTool({arguments: {session: first.session}, name: 'code.attachments'}),
    ).toMatchObject({isError: true, structuredContent: {code: 'session-expired'}})
  })
})

// Native surfaces reuse the same CSV parser through the authenticated app tool boundary.
describe('native table previews', () => {
  it('should parse unsaved quoted table text only for an active workspace session', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'viewer-table-')))
    writeFileSync(join(root, 'data.csv'), 'name,count\ndisk,1')
    const instance = createServer('<html>viewer</html>', {
      integration: 'standard',
      workspaceRoot: root,
    })
    const client = new Client({name: 'Native preview test', version: '1.0.0'})
    const [server, transport] = InMemoryTransport.createLinkedPair()
    await instance.server.connect(server)
    await client.connect(transport)
    try {
      const opened = await client.callTool({
        arguments: {path: join(root, 'data.csv')},
        name: 'code.open',
      })
      const {session} = sessionSchema.parse(opened.structuredContent)
      expect(
        await client.callTool({
          arguments: {delimiter: ',', session, source: 'name,count\n"draft, quoted",2'},
          name: 'code.preview',
        }),
      ).toMatchObject({
        structuredContent: {
          ok: true,
          rows: [
            ['name', 'count'],
            ['draft, quoted', '2'],
          ],
        },
      })
      expect(
        await client.callTool({
          arguments: {delimiter: ',', session: 'unknown', source: 'a,b'},
          name: 'code.preview',
        }),
      ).toMatchObject({isError: true})
    } finally {
      await client.close()
      await instance.dispose()
      rmSync(root, {force: true, recursive: true})
    }
  })
})
