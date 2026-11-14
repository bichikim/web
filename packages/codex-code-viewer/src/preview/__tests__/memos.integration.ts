import {chromium, type Locator, type Page, webkit} from 'playwright'
import {expect as browserExpect} from 'playwright/test'
import {expect, it} from 'vitest'
import {withViewer} from './with-viewer'

const engines = [
  {engine: chromium, name: 'Chromium'},
  {engine: webkit, name: 'WebKit'},
]
const swipe = async (page: Page, row: Locator, distance: number): Promise<void> => {
  const box = await row.boundingBox()
  if (box === null) {
    throw new Error('Missing memo row')
  }
  const x = box.x + box.width / 2
  const y = box.y + 20
  await browserExpect
    .poll(() => row.getByRole('group').evaluate((element) => element.scrollLeft))
    .toBe(80)
  await page.mouse.move(x, y)
  await page.mouse.down()
  await page.mouse.move(x + distance, y, {steps: 12})
  await page.mouse.up()
}

it.each(engines)(
  'should add, edit, attach, delete and restore chat memos in $name',
  async ({engine}) => {
    await withViewer({engine}, async ({app, page, url, call, errors}) => {
      await call('code.save-memos', {patch: {expanded: true, items: [], visible: true}})
      await page.goto(url)
      const panel = app.getByRole('region', {exact: true, name: '메모'})
      const input = panel.getByRole('textbox', {name: '새 메모'})
      await input.fill('처음 메모')
      await panel.getByRole('button', {exact: true, name: '메모 추가'}).click()
      const row = panel.getByRole('listitem')
      await browserExpect(row.getByText('처음 메모', {exact: true})).toBeVisible()
      await row.getByRole('button', {name: '메모 작업'}).click()
      await app.getByRole('menuitem', {exact: true, name: '수정'}).click()
      await panel.getByRole('textbox', {name: '메모 수정'}).fill('수정한 메모')
      await panel.getByRole('button', {exact: true, name: '저장'}).click()
      await browserExpect(row.getByText('수정한 메모', {exact: true})).toBeVisible()
      await swipe(page, row, -100)
      await browserExpect(page.locator('output')).toHaveText('1')
      await browserExpect(page.locator('details > ul > li')).toHaveText(['수정한 메모'])
      await app.getByRole('button', {name: '메모 접기'}).click()
      await app.getByRole('button', {exact: true, name: '메모'}).click()
      await app.getByRole('button', {exact: true, name: '메모'}).click()
      await browserExpect(app.getByRole('button', {name: '메모 펼치기'})).toBeVisible()
      const expanded = page.waitForResponse(
        (response) =>
          response.url().endsWith('/tool') &&
          response.request().postDataJSON().name === 'code.save-memos' &&
          response.request().postDataJSON().arguments.patch.expanded === true,
      )
      await app.getByRole('button', {name: '메모 펼치기'}).click()
      expect((await (await expanded).json()).isError).not.toBe(true)
      await page.reload()
      await browserExpect(row.getByText('수정한 메모', {exact: true})).toBeVisible()
      await swipe(page, row, 100)
      await browserExpect(row).toHaveCount(0)
      await page.reload()
      await browserExpect(input).toBeEnabled()
      await browserExpect(row).toHaveCount(0)
      expect(errors).toEqual([])
    })
  },
)

it.each(engines)(
  'should retain a failed memo draft and persist a successful retry in $name',
  async ({engine}) => {
    await withViewer({engine}, async ({app, page, url, call}) => {
      await call('code.save-memos', {patch: {expanded: true, items: ['원래 메모'], visible: true}})
      await page.goto(url)
      const panel = app.getByRole('region', {exact: true, name: '메모'})
      await page.route('**/tool', async (route) => {
        if (route.request().postDataJSON().name === 'code.save-memos') {
          await route.fulfill({
            json: {content: [], isError: true, structuredContent: {code: 'memo-write-failed'}},
          })
        } else {
          await route.continue()
        }
      })
      await panel.getByRole('textbox', {name: '새 메모'}).fill('재시도 메모')
      await panel.getByRole('button', {exact: true, name: '메모 추가'}).click()
      await browserExpect(
        app.getByRole('status').filter({hasText: '메모를 저장하지 못했습니다.'}),
      ).toContainText('메모를 저장하지 못했습니다.')
      await browserExpect(panel.getByRole('textbox', {name: '새 메모'})).toHaveValue('재시도 메모')
      await browserExpect(panel.getByRole('listitem')).toHaveCount(1)
      await page.unroute('**/tool')
      await panel.getByRole('button', {exact: true, name: '메모 추가'}).click()
      await browserExpect(panel.getByRole('listitem')).toHaveCount(2)
      await page.reload()
      await browserExpect(panel.getByRole('listitem')).toHaveCount(2)
      await browserExpect(panel.getByText('재시도 메모', {exact: true})).toBeVisible()
    })
  },
)
