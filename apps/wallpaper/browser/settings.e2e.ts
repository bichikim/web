import {expect, test} from 'playwright/test'
import {installNative} from './fixtures/native'

test('keeps settings hierarchy and inline random controls usable in a narrow window', async ({
  page,
}) => {
  await page.setViewportSize({height: 540, width: 400})
  await page.goto('/')
  const navigation = page.getByRole('navigation', {name: '설정 화면'})
  await navigation.getByRole('button', {exact: true, name: '위젯'}).click()
  await expect(page.getByRole('heading', {exact: true, level: 2, name: '위젯'})).toBeVisible()
  await page.getByRole('button', {exact: true, name: 'Poffo 불러오기'}).click()
  const dialog = page.getByRole('dialog', {name: 'Poffo 불러오기'})
  await dialog.getByRole('button', {name: '위젯으로 띄우기'}).click()
  await dialog.getByRole('button', {exact: true, name: '닫기'}).click()
  await expect(page.getByRole('button', {exact: true, name: '위젯 1 설정'})).toBeVisible()
  await page.getByRole('radio', {exact: true, name: '행동'}).focus()
  await page.keyboard.press('Space')
  await expect(page.getByRole('radio', {exact: true, name: '랜덤 행동'})).toHaveCount(0)
  const random = page.getByRole('switch', {name: '랜덤 행동 사용'})
  if (!(await random.isChecked())) {
    await random.click()
  }
  const probability = page.getByRole('spinbutton', {name: '랜덤 행동 확률'})
  await probability.fill('65')
  await probability.press('Tab')
  await expect(probability).toHaveValue('65')
  await random.click()
  await expect(probability).toHaveCount(0)
  await random.click()
  await expect(probability).toHaveValue('65')
  const status = page.locator('summary').filter({hasText: /^작업 상태 연결$/})
  await status.click()
  await expect(page.getByRole('combobox', {name: '작업 중 상태 파라미터'})).toBeVisible()
  await status.press('Enter')
  await expect(page.getByRole('combobox', {name: '작업 중 상태 파라미터'})).toBeHidden()
  await expect(navigation).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(400)
  await page.reload()
  await navigation.getByRole('button', {exact: true, name: '위젯'}).click()
  await page.getByRole('radio', {exact: true, name: '행동'}).focus()
  await page.keyboard.press('Space')
  await expect(probability).toHaveValue('65')
})

test('updates connected monitors and preserves selection until the selected screen is removed', async ({
  page,
}) => {
  await installNative(page)
  await page.goto('/')
  const monitors = page.getByRole('group', {exact: true, name: '모니터'})
  await expect(monitors.getByRole('radio', {name: '화면 2'})).toBeVisible()
  await monitors.getByRole('radio', {name: '화면 2'}).focus()
  await page.keyboard.press('Space')
  await page.evaluate(() => {
    globalThis.wallpaperNative.monitors = [
      {id: 'first', name: 'First'},
      {id: 'second', name: 'Second'},
      {id: 'third', name: 'Third'},
    ]
    globalThis.wallpaperNative.emit(null, 'desktop-surface-monitors-changed', null)
  })
  await expect(monitors.getByRole('radio', {name: '화면 3'})).toBeVisible()
  await expect(monitors.getByRole('radio', {name: '화면 2'})).toBeChecked()
  await page.evaluate(() => {
    globalThis.wallpaperNative.monitors = [{id: 'first', name: 'First'}]
    globalThis.wallpaperNative.emit(null, 'desktop-surface-monitors-changed', null)
  })
  await expect(monitors.getByRole('radio')).toHaveCount(1)
  await expect(monitors.getByRole('radio', {name: '화면 1'})).toBeChecked()
  expect(await page.evaluate(() => globalThis.wallpaperNative.unexpected)).toEqual([])
})

test('does not replace a bubble with notifications or positions sent to a different widget', async ({
  page,
}) => {
  await installNative(page, 'poffo-bubble-first')
  await page.goto('/?surface=widget-bubble&widget=first')
  const surface = page.getByRole('main', {name: 'Poffo Codex 말풍선'})
  await expect(surface).toBeVisible()
  await page.evaluate(() => {
    globalThis.wallpaperNative.emit('poffo-bubble-first', 'poffo-codex-state', {
      activity: null,
      received: true,
      recent: [],
      registered: true,
      sessions: [
        {
          notificationId: 1,
          phase: 'working',
          receivedAt: 1,
          sessionId: 'first-chat',
          text: '첫 번째 위젯 작업',
          title: '첫 번째 채팅',
          tool: null,
        },
      ],
    })
  })
  await expect(surface.getByText('첫 번째 위젯 작업', {exact: true})).toBeVisible()
  await page.evaluate(() => {
    globalThis.wallpaperNative.emit('poffo-bubble-second', 'poffo-speech-target', {
      ...globalThis.wallpaperNative.target,
      anchor: 'top',
      insetTop: 160,
    })
    globalThis.wallpaperNative.emit('poffo-bubble-second', 'poffo-codex-state', {
      activity: null,
      received: true,
      recent: [],
      registered: true,
      sessions: [
        {
          notificationId: 2,
          phase: 'working',
          receivedAt: 2,
          sessionId: 'second-chat',
          text: '다른 위젯 작업',
          title: '두 번째 채팅',
          tool: null,
        },
      ],
    })
  })
  await expect(surface).toHaveAttribute('data-anchor', 'bottom')
  await expect(surface.getByText('첫 번째 위젯 작업', {exact: true})).toBeVisible()
  await expect(surface.getByText('다른 위젯 작업', {exact: true})).toHaveCount(0)
  expect(await page.evaluate(() => globalThis.wallpaperNative.unexpected)).toEqual([])
})
