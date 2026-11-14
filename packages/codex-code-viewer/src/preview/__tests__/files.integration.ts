import {readFile, writeFile} from 'node:fs/promises'
import {join} from 'node:path'
import {chromium, webkit} from 'playwright'
import {expect as browserExpect} from 'playwright/test'
import {expect, it} from 'vitest'
import {type ViewerFixture, withViewer} from './with-viewer'

const engines = [
  {engine: chromium, name: 'Chromium'},
  {engine: webkit, name: 'WebKit'},
]
const openFile = async (viewer: ViewerFixture, path: string): Promise<void> => {
  await viewer.app
    .getByRole('combobox', {name: '파일 경로 또는 검색어'})
    .fill(join(viewer.workspace, path))
  await viewer.app.getByRole('button', {exact: true, name: '파일 열기'}).click()
}

it.each(engines)(
  'should preserve unsaved text on a save conflict and save against a refreshed revision in $name',
  async ({engine}) => {
    await withViewer(
      {engine, files: {'main.txt': 'original\n', 'other.txt': 'other\n'}},
      async (viewer) => {
        const {app, page, url, workspace} = viewer
        await page.goto(url)
        await openFile(viewer, 'main.txt')
        await app.getByRole('button', {exact: true, name: '편집'}).click()
        const editor = app.getByRole('textbox', {name: '코드 편집기'})
        await editor.fill('user draft\n')
        await writeFile(join(workspace, 'main.txt'), 'external change\n')
        await app.getByRole('button', {exact: true, name: '저장'}).click()
        await browserExpect(app.getByRole('status').filter({hasText: '변경'})).toBeVisible()
        await browserExpect(editor).toHaveText('user draft')
        expect(await readFile(join(workspace, 'main.txt'), 'utf8')).toBe('external change\n')
        await app.getByRole('button', {name: '편집 더 보기'}).click()
        await app.getByRole('menuitem', {name: '변경 버리기'}).click()
        await browserExpect(editor).toHaveText('external change')
        await editor.fill('saved draft\n')
        await app.getByRole('button', {exact: true, name: '저장'}).click()
        await browserExpect
          .poll(() => readFile(join(workspace, 'main.txt'), 'utf8'))
          .toBe('saved draft\n')
        await openFile(viewer, 'other.txt')
        await browserExpect(app.getByText('other', {exact: true})).toBeVisible()
        await openFile(viewer, 'main.txt')
        await browserExpect(editor).toHaveText('saved draft')
        expect(viewer.errors).toEqual([])
      },
    )
  },
)

it.each(engines)(
  'should cancel an unfinished navigation stream and open another file in $name',
  async ({engine}) => {
    await withViewer(
      {engine, files: {'helper.ts': 'export const greet = () => 1\n', 'second.txt': 'second file'}},
      async (viewer) => {
        const {page, app, url} = viewer
        await page.goto(url)
        await openFile(viewer, 'helper.ts')
        const entered = Promise.withResolvers<void>()
        const release = Promise.withResolvers<void>()
        const stopped = Promise.withResolvers<void>()
        await page.route('**/stream/**', async (route) => {
          entered.resolve()
          await release.promise
          await route.abort('aborted')
          stopped.resolve()
        })
        await app.getByRole('link', {exact: true, name: '정의·사용처 찾기: greet'}).click()
        try {
          await entered.promise
          const menu = app.getByRole('menu')
          await browserExpect(menu).toBeVisible()
          await page.keyboard.press('Escape')
          await browserExpect(menu).toHaveCount(0)
        } finally {
          release.resolve()
        }
        await stopped.promise
        await openFile(viewer, 'second.txt')
        await browserExpect(app.getByText('second file', {exact: true})).toBeVisible()
        await browserExpect(app.getByRole('menu')).toHaveCount(0)
      },
    )
  },
)

it.each(engines)(
  'should follow a definition and replay references after returning to the declaration in $name',
  async ({engine}) => {
    await withViewer(
      {
        engine,
        files: {
          'helper.ts': 'export const greet = () => 1\n',
          'main.ts': "import {greet} from './helper'\nexport const result = greet()\n",
        },
      },
      async (viewer) => {
        const {app, page, url} = viewer
        await page.goto(url)
        await openFile(viewer, 'main.ts')
        await app.getByRole('link', {exact: true, name: '정의·사용처 찾기: greet'}).last().click()
        await browserExpect(
          app.getByRole('link', {exact: true, name: '정의·사용처 찾기: greet'}),
        ).toHaveCount(1)
        await app.getByRole('link', {exact: true, name: '정의·사용처 찾기: greet'}).click()
        const choices = app.getByRole('menu', {exact: true, name: '사용처'})
        await browserExpect(choices).toContainText('main.ts')
        await page.keyboard.press('Escape')
        await app.getByRole('link', {exact: true, name: '정의·사용처 찾기: greet'}).click()
        await browserExpect(choices).toContainText('main.ts')
        expect(viewer.errors).toEqual([])
      },
    )
  },
)
