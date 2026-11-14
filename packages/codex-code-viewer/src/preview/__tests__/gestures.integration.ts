import {type Locator, type Page} from 'playwright'
import {expect as browserExpect} from 'playwright/test'
import {expect, it} from 'vitest'
import {withViewer} from './with-viewer'

const center = async (row: Locator): Promise<void> => {
  await browserExpect
    .poll(() => row.getByRole('group').evaluate((element) => element.scrollLeft))
    .toBe(80)
  await browserExpect
    .poll(() => row.getByRole('group').evaluate((element) => getComputedStyle(element).overflowX))
    .toBe('auto')
}
const touch = async (
  page: Page,
  row: Locator,
  distance: number,
  cancelled = false,
): Promise<void> => {
  await center(row)
  const box = await row.boundingBox()
  if (box === null) {
    throw new Error('Missing touch target')
  }
  const x = box.x + box.width / 2
  const y = box.y + 20
  const cdp = await page.context().newCDPSession(page)
  try {
    await cdp.send('Input.dispatchTouchEvent', {touchPoints: [{x, y}], type: 'touchStart'})
    for (const fraction of [0.1, 0.3, 0.6, 0.8, 1]) {
      // oxlint-disable-next-line no-await-in-loop -- A real gesture delivers ordered native input events.
      await cdp.send('Input.dispatchTouchEvent', {
        touchPoints: [{x: x + distance * fraction, y}],
        type: 'touchMove',
      })
    }
    await cdp.send('Input.dispatchTouchEvent', {
      touchPoints: [],
      type: cancelled ? 'touchCancel' : 'touchEnd',
    })
  } finally {
    await cdp.detach()
  }
}

it.each(['touch', 'wheel'] as const)(
  'should attach left and delete right through native %s scrolling',
  async (kind) => {
    await withViewer({}, async ({page, app, url, call, errors}) => {
      await call('code.save-memos', {
        patch: {expanded: true, items: ['첨부 대상', '삭제 대상', '유지 대상'], visible: true},
      })
      await page.goto(url)
      const panel = app.getByRole('region', {exact: true, name: '메모'})
      const attach = panel.getByRole('listitem').filter({hasText: '첨부 대상'})
      await center(attach)
      if (kind === 'touch') {
        await touch(page, attach, -110)
      } else {
        await attach.hover()
        await page.mouse.wheel(110, 0)
      }
      await browserExpect(page.locator('output')).toHaveText('1')
      await browserExpect(page.locator('details > ul > li')).toHaveText(['첨부 대상'])
      await center(attach)
      const remove = panel.getByRole('listitem').filter({hasText: '삭제 대상'})
      await center(remove)
      if (kind === 'touch') {
        await touch(page, remove, 110)
      } else {
        await remove.hover()
        await page.mouse.wheel(-110, 0)
      }
      await browserExpect(panel.getByRole('listitem')).toHaveCount(2)
      await page.reload()
      await browserExpect(panel.getByRole('listitem')).toHaveCount(2)
      await browserExpect(panel.getByText('삭제 대상', {exact: true})).toHaveCount(0)
      expect(errors).toEqual([])
    })
  },
)

it.each(['cancelled-touch', 'programmatic-scroll'] as const)(
  'should preserve memos after %s',
  async (kind) => {
    await withViewer({}, async ({page, app, url, call}) => {
      await call('code.save-memos', {
        patch: {expanded: true, items: ['취소 대상', '유지 대상'], visible: true},
      })
      await page.goto(url)
      const panel = app.getByRole('region', {exact: true, name: '메모'})
      const row = panel.getByRole('listitem').filter({hasText: '취소 대상'})
      await center(row)
      const mutations: unknown[] = []
      page.on('request', (request) => {
        if (request.url().endsWith('/tool') && request.postDataJSON().name === 'code.save-memos') {
          mutations.push(request.postDataJSON())
        }
      })
      if (kind === 'cancelled-touch') {
        await touch(page, row, 110, true)
      } else {
        await row.getByRole('group').evaluate((element) => element.scrollTo({left: 0}))
      }
      await center(row)
      await browserExpect(panel.getByRole('listitem')).toHaveCount(2)
      expect(mutations).toEqual([])
      await page.reload()
      await browserExpect(panel.getByRole('listitem')).toHaveCount(2)
    })
  },
)

it('should restore the swiped memo after deletion fails and allow a later retry', async () => {
  await withViewer({}, async ({page, app, url, call}) => {
    await call('code.save-memos', {patch: {expanded: true, items: ['삭제 재시도'], visible: true}})
    await page.goto(url)
    const row = app.getByRole('region', {exact: true, name: '메모'}).getByRole('listitem')
    await page.route('**/tool', async (route) => {
      if (route.request().postDataJSON().name === 'code.save-memos') {
        await route.fulfill({
          json: {content: [], isError: true, structuredContent: {code: 'memo-write-failed'}},
        })
      } else {
        await route.continue()
      }
    })
    await touch(page, row, 110)
    await browserExpect(
      app.getByRole('status').filter({hasText: '메모를 저장하지 못했습니다.'}),
    ).toBeVisible()
    await browserExpect(row.getByText('삭제 재시도', {exact: true})).toBeVisible()
    await center(row)
    await app.getByRole('button', {name: '알림 닫기'}).click()
    await browserExpect(
      app.getByRole('status').filter({hasText: '메모를 저장하지 못했습니다.'}),
    ).toHaveCount(0)
    await page.unroute('**/tool')
    await touch(page, row, 110)
    await browserExpect(row).toHaveCount(0)
    await page.reload()
    await browserExpect(row).toHaveCount(0)
  })
})
