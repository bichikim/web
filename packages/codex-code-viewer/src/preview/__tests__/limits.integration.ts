import {join} from 'node:path'
import {chromium, webkit} from 'playwright'
import {expect as browserExpect} from 'playwright/test'
import {expect, it} from 'vitest'
import {CallToolResultSchema} from '@modelcontextprotocol/sdk/types.js'
import {MAX_MEMO_ITEMS, MAX_MEMO_LENGTH, memoStateSchema} from '../../shared/memo-state'
import {MAX_CODE_BYTES} from '../../shared/editing-limits'
import {MAX_TEXT_BYTES} from '../../shared/reading-limits'
import {withViewer} from './with-viewer'

const engines = [
  {engine: chromium, name: 'Chromium'},
  {engine: webkit, name: 'WebKit'},
]

it.each(engines)(
  'should enforce memo item and text limits without changing persisted state in $name',
  async ({engine}) => {
    await withViewer({engine}, async ({app, page, url, call}) => {
      const items = Array.from(
        {length: MAX_MEMO_ITEMS},
        (_, index) => `${index}:${'가'.repeat(MAX_MEMO_LENGTH - `${index}:`.length)}`,
      )
      await call('code.save-memos', {patch: {expanded: true, items, visible: true}})
      await page.goto(url)
      const panel = app.getByRole('region', {exact: true, name: '메모'})
      await browserExpect(panel.getByRole('listitem')).toHaveCount(MAX_MEMO_ITEMS)
      const input = panel.getByRole('textbox', {name: '새 메모'})
      await input.fill('한도 초과')
      await browserExpect(
        panel.getByRole('button', {exact: true, name: '메모 추가'}),
      ).toBeDisabled()
      await input.fill('나'.repeat(MAX_MEMO_LENGTH))
      await input.press('End')
      await input.press('x')
      await browserExpect(input).toHaveValue('나'.repeat(MAX_MEMO_LENGTH))
      for (const invalid of [[...items, 'extra'], ['x'.repeat(MAX_MEMO_LENGTH + 1)]]) {
        // oxlint-disable-next-line no-await-in-loop -- Verify rejection before probing unchanged persisted state.
        const response = await call('code.save-memos', {patch: {items: invalid}})
        expect(response.isError).toBe(true)
        // oxlint-disable-next-line no-await-in-loop -- Read only after the preceding invalid write has completed.
        const persisted = await call('code.memos')
        expect(memoStateSchema.parse(persisted.structuredContent).items).toEqual(items)
      }
      await panel.getByRole('listitem').last().getByRole('button', {name: '메모 작업'}).click()
      await app.getByRole('menuitem', {exact: true, name: '삭제'}).click()
      await browserExpect(panel.getByRole('listitem')).toHaveCount(MAX_MEMO_ITEMS - 1)
      await panel.getByRole('button', {exact: true, name: '메모 추가'}).click()
      await browserExpect(panel.getByRole('listitem')).toHaveCount(MAX_MEMO_ITEMS)
      await page.reload()
      await browserExpect(panel.getByRole('listitem')).toHaveCount(MAX_MEMO_ITEMS)
    })
  },
)

it('should enforce text editing and reading byte limits without losing the session', async () => {
  await withViewer(
    {
      files: {
        'editable.txt': 'a'.repeat(MAX_CODE_BYTES),
        'exceeded.txt': 'd'.repeat(MAX_TEXT_BYTES + 1),
        'maximum.txt': 'c'.repeat(MAX_TEXT_BYTES),
        'readonly.txt': 'b'.repeat(MAX_CODE_BYTES + 1),
      },
    },
    async ({page, url, call, app, workspace}) => {
      const panel = CallToolResultSchema.parse(
        await (await page.request.get(`${url}initial`)).json(),
      )
      const session = panel.structuredContent?.session
      expect(typeof session).toBe('string')
      const editable = await call('code.read', {path: 'editable.txt', session})
      expect(editable.structuredContent?.document).toMatchObject({
        source: 'a'.repeat(MAX_CODE_BYTES),
      })
      const readonly = await call('code.read', {path: 'readonly.txt', session})
      expect(readonly.structuredContent?.document).toMatchObject({readOnly: true})
      const maximum = await call('code.read', {path: 'maximum.txt', session})
      expect(maximum.isError).not.toBe(true)
      expect(maximum.structuredContent?.document).toMatchObject({
        readOnly: true,
        sourceLength: MAX_TEXT_BYTES,
      })
      const exceeded = await call('code.read', {path: 'exceeded.txt', session})
      expect(exceeded.isError).toBe(true)
      expect(exceeded.structuredContent).toEqual({code: 'text-too-large'})
      await call('code.close', {session})
      await page.goto(url)
      const path = app.getByRole('combobox', {name: '파일 경로 또는 검색어'})
      await path.fill(join(workspace, 'readonly.txt'))
      await app.getByRole('button', {exact: true, name: '파일 열기'}).click()
      await browserExpect(app.getByText('읽기 전용', {exact: true})).toBeVisible()
      await browserExpect(app.getByRole('button', {exact: true, name: '편집'})).toHaveCount(0)
      await path.fill(join(workspace, 'editable.txt'))
      await app.getByRole('button', {exact: true, name: '파일 열기'}).click()
      await browserExpect(app.getByRole('button', {exact: true, name: '편집'})).toBeEnabled()
    },
  )
})
