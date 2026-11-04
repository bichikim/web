import {expect, type Locator, type Page, type Route, test} from '@playwright/test'

const QUESTION = '제 성향의 강점과 주의할 점을 알려주세요.'
const BODY =
  '사주를 살펴보면 약속을 소중히 여기는 면이 읽혀요.\n\n맡을 수 있는 범위를 먼저 정해 보세요.'
const OPENING = '아래 내용을 참고해 보면, '
const USAGE = {
  day: '2026-11-04',
  limit: 3,
  remaining: 2,
  resetsAt: '2026-11-04T15:00:00.000Z',
  used: 1,
}

const completeReading = (route: Route, text: string) =>
  route.fulfill({
    contentType: 'application/json',
    json: {modelId: 'review-fixture', text, tokenCount: 20, usage: USAGE},
  })

const openSaju = async (page: Page) => {
  await page.addInitScript((question) => {
    localStorage.setItem(
      'pomo:text-generation-settings:v1',
      JSON.stringify({modelId: 'cloud', version: 1}),
    )
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 1788912000000, trackIds: [], version: 1}),
    )
    localStorage.setItem(
      'pomo:saju:form-draft:v1',
      JSON.stringify({
        calendar: 'solar',
        gender: 'N',
        leapMonth: false,
        lunarDay: '',
        lunarMonth: '',
        lunarYear: '',
        question,
        solarDay: '16',
        solarMonth: '3',
        solarYear: '1995',
        time: '',
        version: 1,
      }),
    )
  }, QUESTION)
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await page.getByRole('button', {exact: true, name: '생각 보조'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: 'Pomofi 생각 보조'})
  await dialog.getByRole('tab', {exact: true, name: '사주'}).click()
  const panel = dialog.getByRole('tabpanel', {name: '사주'})
  await panel.getByRole('textbox', {name: '질문'}).waitFor({state: 'visible'})
  await expect(panel.getByRole('textbox', {name: '질문'})).toHaveValue(QUESTION)
  return panel
}

const relativePosition = (control: Locator) =>
  control.evaluate((element) => {
    const form = element.closest('form')!
    const formBounds = form.getBoundingClientRect()
    const bounds = element.getBoundingClientRect()
    return {
      formHeight: formBounds.height,
      height: bounds.height,
      width: bounds.width,
      x: bounds.left - formBounds.left,
      y: bounds.top - formBounds.top,
    }
  })

for (const width of [390, 1280]) {
  test(`should preserve Saju controls through cancel, completion and reset at ${width}px`, async ({
    page,
  }) => {
    await page.setViewportSize({height: 900, width})
    const pending = Promise.withResolvers<Route>()
    let submissions = 0
    await page.route('**/api/cloud-text*', async (route) => {
      switch (route.request().method()) {
        case 'POST':
          submissions += 1
          if (submissions === 1) {
            pending.resolve(route)
          } else {
            await completeReading(route, `${OPENING}${BODY}`)
          }
          return
        case 'DELETE':
          await route.fulfill({status: 204})
          return
        default:
          await route.fulfill({json: USAGE})
      }
    })
    const panel = await openSaju(page)
    const generate = panel.getByRole('button', {exact: true, name: '사주 풀이 생성'})
    const reset = panel.getByRole('button', {exact: true, name: '입력 지우기'})
    await page.evaluate(() => document.fonts.ready)
    const before = {
      generate: await relativePosition(generate),
      reset: await relativePosition(reset),
    }
    await generate.click()
    const pendingRoute = await pending.promise
    expect(pendingRoute.request().postDataJSON()).toMatchObject({
      maximumTokens: 2048,
      temperature: 0.2,
    })
    const busyGenerate = panel.getByRole('button', {exact: true, name: '사주 풀이 중…'})
    const cancel = panel.getByRole('button', {exact: true, name: '취소'})
    await expect(cancel).toBeVisible()
    await expect(reset).toBeDisabled()
    expect(await relativePosition(busyGenerate)).toEqual(before.generate)
    expect(await relativePosition(reset)).toEqual(before.reset)
    const cancelled = page.waitForRequest(
      (request) => request.url().includes('/api/cloud-text?') && request.method() === 'DELETE',
    )
    await cancel.click()
    await cancelled
    await expect(reset).toBeEnabled()
    expect(await relativePosition(generate)).toEqual(before.generate)
    expect(await relativePosition(reset)).toEqual(before.reset)
    await completeReading(pendingRoute, '취소한 요청의 늦은 결과')
    await expect(panel.getByRole('region', {name: '사주 풀이 결과'})).toHaveCount(0)
    await generate.click()
    await expect(panel.getByRole('region', {name: '사주 풀이 결과'})).toHaveText(BODY)
    expect(submissions).toBe(2)
    await reset.click()
    await expect(panel.getByRole('textbox', {name: '질문'})).toHaveValue('')
    expect(await page.evaluate(() => localStorage.getItem('pomo:saju:form-draft:v1'))).toBeNull()
  })
}

test('should display a nonempty provider response even when it contains only a reference opening', async ({
  page,
}) => {
  await page.route('**/api/cloud-text*', async (route) => {
    if (route.request().method() === 'POST') {
      await completeReading(route, OPENING)
    } else {
      await route.fulfill({json: USAGE})
    }
  })
  const panel = await openSaju(page)
  await panel.getByRole('button', {exact: true, name: '사주 풀이 생성'}).click()
  await expect(panel.getByRole('region', {name: '사주 풀이 결과'})).toHaveText(OPENING.trim())
})
