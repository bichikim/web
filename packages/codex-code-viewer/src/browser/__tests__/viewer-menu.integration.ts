import {mkdtemp, readFile, realpath, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {Client} from '@modelcontextprotocol/sdk/client/index.js'
import {InMemoryTransport} from '@modelcontextprotocol/sdk/inMemory.js'
import {type BrowserType, chromium, type FrameLocator, webkit} from 'playwright'
import {expect as browserExpect} from 'playwright/test'
import {expect, it, type Mock, vi} from 'vitest'
import {createServer} from '../../server/create-server'
import type {Result} from '../../shared/contracts'
import {createBrowserServer} from '../create-browser-server'
import type {ComposerAttachment} from '../create-composer-attachment'

const engines = [
  {engine: chromium, name: 'Chromium'},
  {engine: webkit, name: 'WebKit'},
]

interface MenuAttachmentWriter {
  (content: unknown, filename?: string): Promise<Result<string>>
}

interface ViewerMenuFixture {
  readonly client: Client
  readonly composer: Mock<ComposerAttachment>
  readonly frame: FrameLocator
  readonly session: string
  readonly url: string
  readonly writeAttachment: Mock<MenuAttachmentWriter>
}

const withViewerMenu = async (
  engine: BrowserType,
  exercise: (fixture: ViewerMenuFixture) => Promise<void>,
): Promise<void> => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'viewer-menu-')))
  const disposals: Array<() => Promise<void>> = [() => rm(root, {force: true, recursive: true})]
  const errors: unknown[] = []
  try {
    await writeFile(join(root, 'main.ts'), 'export const first = 1\nexport const second = 2\n')
    const appHtml = (
      await readFile(new URL('../../../dist/app.html', import.meta.url), 'utf8')
    ).replace('<html ', '<html data-host="standard" ')
    const html = await readFile(new URL('../../../dist/browser.html', import.meta.url), 'utf8')
    const writeAttachment = vi.fn<MenuAttachmentWriter>().mockResolvedValue({
      ok: true,
      value: '/private/tmp/code-viewer-attachment-test/code-viewer-context.txt',
    })
    const backend = createServer(appHtml, {
      clipboard: {read: vi.fn(), write: vi.fn(), writeAttachment},
      integration: 'standard',
      workspaceRoot: root,
    })
    disposals.unshift(() => backend.dispose())
    const client = new Client({name: 'Menu regression', version: '1.0.0'})
    disposals.unshift(() => client.close())
    const [server, transport] = InMemoryTransport.createLinkedPair()
    await backend.server.connect(server)
    await client.connect(transport)
    const composer = vi.fn<ComposerAttachment>(async (_viewer, exportFile) => {
      const file = await exportFile()
      return file.ok ? {ok: true as const, value: true} : file
    })
    const viewer = await createBrowserServer({appHtml, client, composer, html})
    disposals.unshift(() => viewer.close())
    const browser = await engine.launch({headless: true})
    disposals.unshift(() => browser.close())
    const {session, url} = await viewer.open()
    await viewer.navigate({column: 1, line: 1, path: 'main.ts'})
    const page = await browser.newPage({locale: 'ko-KR'})
    await page.addInitScript(() => {
      localStorage.setItem('codex-code-viewer.language', 'ko')
    })
    await page.goto(url)
    const frame = page.frameLocator('iframe[title="Code Viewer"]')
    await browserExpect(frame.getByRole('button', {name: '1줄 선택'})).toBeVisible({
      timeout: 1500,
    })
    await exercise({client, composer, frame, session, url, writeAttachment})
  } catch (error) {
    errors.push(error)
  }
  await disposals.reduce(async (previous, dispose) => {
    await previous
    try {
      await dispose()
    } catch (error) {
      errors.push(error)
    }
  }, Promise.resolve())
  if (errors.length === 1) {
    throw errors[0]
  }
  if (errors.length > 1) {
    throw new AggregateError(errors, 'Failed to run or dispose the menu test fixture.')
  }
}

it.each(engines)(
  'should keep the source context menu open after secondary-button release in $name',
  async ({engine}) => {
    await withViewerMenu(engine, async ({frame}) => {
      const menu = frame.getByRole('menu', {name: '코드 작업'})
      const exercise = async (line: number): Promise<void> => {
        await frame.getByRole('button', {name: `${line}줄 선택`}).click({button: 'right'})
        await browserExpect(menu).toBeVisible({timeout: 1500})
        await menu.press('Escape')
        await browserExpect(menu).toHaveCount(0)
      }
      await [1, 2, 1, 2].reduce(async (previous, line) => {
        await previous
        await exercise(line)
      }, Promise.resolve())
      await frame.getByRole('button', {name: '1줄 선택'}).click({button: 'right'})
      await browserExpect(menu).toBeVisible()
      await frame.getByRole('combobox', {name: '파일 경로 또는 검색어'}).click()
      await browserExpect(menu).toHaveCount(0)
    })
  },
)

it.each(engines)(
  'should attach source and tree selections from their context menus in $name',
  async ({engine}) => {
    await withViewerMenu(
      engine,
      async ({client, composer, frame, session, url, writeAttachment}) => {
        const menu = frame.getByRole('menu', {name: '코드 작업'})
        await frame.getByRole('button', {name: '2줄 선택'}).click({button: 'right'})
        await browserExpect(menu).toBeVisible()
        await frame.getByRole('menuitem', {name: '채팅창에 추가'}).click()
        await browserExpect(frame.getByRole('menu', {name: '코드 작업'})).toHaveCount(0)
        await vi.waitFor(() => expect(composer).toHaveBeenCalledOnce())
        expect(composer).toHaveBeenCalledOnce()
        expect(composer).toHaveBeenCalledWith(url, expect.any(Function))
        expect(writeAttachment).toHaveBeenCalledWith(
          expect.stringContaining('export const second = 2'),
          'main.ts.selection.txt',
        )
        await browserExpect(frame.getByText(/첨부할 내용 \d+개/u)).toHaveCount(0)
        await frame.getByRole('button', {exact: true, name: '파일 트리'}).click()
        await frame.getByRole('treeitem', {exact: true, name: 'main.ts'}).click({button: 'right'})
        await frame.getByRole('menuitem', {name: '채팅창에 추가'}).click()
        await vi.waitFor(() => expect(composer).toHaveBeenCalledTimes(2))
        expect(writeAttachment).toHaveBeenLastCalledWith(
          Buffer.from('export const first = 1\nexport const second = 2\n'),
          'main.ts',
        )
        await browserExpect(frame.getByText(/첨부할 내용 \d+개/u)).toHaveCount(0)
        expect(
          await client.callTool({arguments: {session}, name: 'code.attachments'}),
        ).toMatchObject({content: []})
      },
    )
  },
)
