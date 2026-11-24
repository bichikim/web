import {expect, type Page, test} from 'playwright/test'
import {installNative} from './fixtures/native'

const selectSetting = async (page: Page, label: string, option: string) => {
  await page.getByRole('combobox', {exact: true, name: label}).press('Space')
  await page.getByRole('option', {exact: true, name: option}).click()
}

test('keeps settings hierarchy and inline random controls usable in a narrow window', async ({
  page,
}) => {
  await page.setViewportSize({height: 540, width: 400})
  await page.goto('/')
  const navigation = page.getByRole('navigation', {name: '위젯 설정 경로'})
  await selectSetting(page, '설정 화면 선택', '위젯')
  await page.getByRole('button', {exact: true, name: 'Poffo 불러오기'}).click()
  const dialog = page.getByRole('dialog', {name: 'Poffo 불러오기'})
  await page
    .getByRole('region', {name: 'Poffo 불러오기'})
    .getByRole('button', {exact: true, name: 'Poffo 불러오기'})
    .click()
  await dialog.getByRole('button', {name: '위젯으로 띄우기'}).click()
  await expect(navigation.getByRole('combobox', {name: '편집할 위젯'})).toHaveText(/위젯 1/u)
  await dialog.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.getByRole('button', {exact: true, name: '행동'}).press('Space')
  await page.getByRole('button', {exact: true, name: '랜덤 행동'}).click()
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
  await selectSetting(page, '행동 설정 항목', '작업 상태 연결')
  await page.getByRole('button', {exact: true, name: '작업 중 편집'}).click()
  const working = page.getByRole('group', {name: '작업 중 상태 연결'})
  await expect(working.getByRole('button', {name: '작업 중 수동 실행'})).toBeVisible()
  await selectSetting(page, '행동 설정 항목', '랜덤 행동')
  await expect(working).toBeHidden()
  await expect(probability).toHaveValue('65')
  await expect(navigation).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(400)
  await page.reload()
  await selectSetting(page, '설정 화면 선택', '위젯')
  await page.getByRole('button', {exact: true, name: '열린 위젯'}).click()
  await page.getByRole('button', {name: /위젯 1$/u}).click()
  await page.getByRole('button', {exact: true, name: '행동'}).press('Space')
  await page.getByRole('button', {exact: true, name: '랜덤 행동'}).click()
  await expect(probability).toHaveValue('65')
})

test('updates connected monitors and preserves selection until the selected screen is removed', async ({
  page,
}) => {
  await installNative(page)
  await page.goto('/')
  await selectSetting(page, '설정 화면 선택', '배경')
  const monitors = page.getByRole('combobox', {exact: true, name: '화면 선택'})
  await selectSetting(page, '화면 선택', '화면 2')
  await expect(monitors).toHaveText('화면 2')
  await page.evaluate(() => {
    globalThis.wallpaperNative.monitors = [
      {id: 'first', name: 'First'},
      {id: 'second', name: 'Second'},
      {id: 'third', name: 'Third'},
    ]
    globalThis.wallpaperNative.emit(null, 'desktop-surface-monitors-changed', null)
  })
  await monitors.press('Space')
  await expect(page.getByRole('option', {name: '화면 3'})).toBeVisible()
  await expect(page.getByRole('option', {name: '화면 2'})).toHaveAttribute('aria-selected', 'true')
  await monitors.press('Escape')
  await page.evaluate(() => {
    globalThis.wallpaperNative.monitors = [{id: 'first', name: 'First'}]
    globalThis.wallpaperNative.emit(null, 'desktop-surface-monitors-changed', null)
  })
  await expect(monitors).toHaveText('화면 1')
  await monitors.press('Space')
  await expect(page.getByRole('option')).toHaveCount(1)
  await expect(page.getByRole('option', {name: '화면 1'})).toHaveAttribute('aria-selected', 'true')
  expect(await page.evaluate(() => globalThis.wallpaperNative.unexpected)).toEqual([])
})

test('does not replace a bubble with notifications or positions sent to a different widget', async ({
  page,
}) => {
  await installNative(page, 'poffo-bubble-first')
  await page.goto('/?surface=widget-bubble&widget=first')
  const surface = page.getByRole('main', {name: 'Poffo 대화 말풍선'})
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
  const notification = surface.getByText('첫 번째 위젯 작업', {exact: true})
  await expect(notification).toBeAttached()
  await surface.getByRole('button', {name: '캐릭터 대화 선택'}).hover()
  await surface.getByRole('button', {name: '채팅 첫 번째 채팅 선택'}).click()
  await expect(notification).toBeVisible()
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
  await expect(notification).toBeVisible()
  await expect(surface.getByText('다른 위젯 작업', {exact: true})).toHaveCount(0)
  expect(await page.evaluate(() => globalThis.wallpaperNative.unexpected)).toEqual([])
})
