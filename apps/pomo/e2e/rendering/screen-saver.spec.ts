import {expect, type Page, test, type TestInfo} from '@playwright/test'

test.use({hasTouch: true})

for (const freeze of [false, true]) {
  test(`should dismiss the screen saver on the first Escape (freeze closing delay: ${freeze})`, async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', {exact: true, name: '시작하기'}).click()
    await page.getByRole('button', {exact: true, name: '설정'}).click()
    const settings = page.getByRole('dialog', {name: 'Pomofi 설정'})
    await settings.getByRole('button', {name: /^스크린 세이버 /u}).click()
    await page.getByRole('option', {exact: true, name: '5초 후'}).click()
    await settings.getByRole('button', {exact: true, name: '닫기'}).click()
    await page.getByRole('button', {exact: true, name: '설정'}).click()
    await expect(settings.getByRole('button', {name: /^스크린 세이버 /u})).toContainText('5초 후')
    await settings.getByRole('button', {exact: true, name: '닫기'}).click()
    await page.getByRole('button', {exact: true, name: '설정'}).focus()
    await page.keyboard.press('Control')
    await expect(page.getByRole('tooltip')).toBeVisible()
    await page.waitForFunction(
      () => document.querySelector('dialog.pomo-screen-saver')?.hasAttribute('open'),
      null,
      {polling: 'raf', timeout: 8000},
    )
    // Freeze only after automatic entry so the closing interval cannot elapse before keyboard delivery.
    if (freeze) {
      await page.clock.pauseAt(new Date())
    }
    await expect(page.getByRole('tooltip')).toBeVisible()
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog', {exact: true, name: '스크린 세이버'})).not.toBeVisible()
  })
}

for (const input of ['pointer', 'touch', 'Escape'] as const) {
  test(`should preserve settings and focus behind the screen saver (input: ${input})`, async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', {exact: true, name: '시작하기'}).click()
    await page.getByRole('button', {exact: true, name: '설정'}).click()
    const settings = page.getByRole('dialog', {name: 'Pomofi 설정'})
    await settings.getByRole('button', {name: /^스크린 세이버 /u}).click()
    await page.getByRole('option', {exact: true, name: '5초 후'}).click()
    const close = settings.getByRole('button', {exact: true, name: '닫기'})
    await close.focus()
    const saver = page.locator('dialog.pomo-screen-saver')
    await expect(saver).toBeVisible({timeout: 8000})
    switch (input) {
      case 'pointer':
        await page.mouse.down()
        await page.mouse.up()
        break
      case 'touch':
        await page.touchscreen.tap(10, 10)
        break
      case 'Escape':
        await page.keyboard.press('Escape')
        break
      default:
        throw new Error(`Unsupported dismissal input: ${input satisfies never}`)
    }
    await expect(saver).not.toBeVisible()
    await expect(settings).toBeVisible()
    await expect(close).toBeFocused()
  })
}

for (const input of ['pointer', 'touch', 'movement', 'Escape'] as const) {
  test(`should restore focus and Tab order after screen saver dismissal with ${input}`, async ({
    page,
  }) => {
    await page.goto('/')
    await page.getByRole('button', {exact: true, name: '시작하기'}).click()
    const trigger = page.getByRole('button', {exact: true, name: '설정'})
    await trigger.click()
    const settings = page.getByRole('dialog', {name: 'Pomofi 설정'})
    await settings.getByRole('button', {name: /^스크린 세이버 /u}).click()
    await page.getByRole('option', {exact: true, name: '5초 후'}).click()
    await settings.getByRole('button', {exact: true, name: '닫기'}).click()
    await trigger.focus()
    await page.keyboard.press('Control')
    const saver = page.getByRole('dialog', {exact: true, name: '스크린 세이버'})
    await expect(saver).toBeVisible({timeout: 8000})
    await expect(saver).toBeFocused()
    switch (input) {
      case 'pointer':
        // Moving before pressing would dismiss the saver through a different path.
        await page.mouse.down()
        await page.mouse.up()
        break
      case 'touch':
        await page.touchscreen.tap(10, 10)
        break
      case 'movement':
        await page.mouse.move(10, 10)
        break
      case 'Escape':
        await page.keyboard.press('Escape')
        break
      default:
        throw new Error(`Unsupported dismissal input: ${input satisfies never}`)
    }
    await expect(saver).not.toBeVisible()
    await expect(trigger).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(page.getByRole('button', {exact: true, name: '새 업데이트 보기'})).toBeFocused()
  })
}

const captureScreenSaver = async (page: Page, information: TestInfo) => {
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images)
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode()),
    )
  })
  await expect.soft(page).toHaveScreenshot('screen-saver-dark.png', {animations: 'disabled'})
  const current = information.outputPath('screen-saver-dark-current.png')
  await page.screenshot({animations: 'disabled', path: current})
  await information.attach('screen-saver-dark', {contentType: 'image/png', path: current})
  await information.attach('screen-saver-environment', {
    body: JSON.stringify(
      await page.evaluate(() => ({
        devicePixelRatio,
        fonts: Array.from(document.fonts).map((font) => ({
          family: font.family,
          status: font.status,
        })),
        locale: navigator.language,
        theme: document.documentElement.className,
        time: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        userAgent: navigator.userAgent,
        viewport: {height: innerHeight, width: innerWidth},
      })),
    ),
    contentType: 'application/json',
  })
}

test('should persist screen saver settings and support keyboard and pointer dismissal', async ({
  page,
}, information) => {
  test.setTimeout(240_000)
  await page.clock.setFixedTime(new Date('2026-09-09T00:00:00.000Z'))
  // Keep unrelated catalog selection out of the inactivity and rendering checks.
  await page.addInitScript(() => {
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 1788912000000, trackIds: [], version: 1}),
    )
  })
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await expect(page.locator('.pomo-scene-fallback')).toHaveCount(0)
  const settings = page.getByRole('dialog', {name: 'Pomofi 설정'})
  const trigger = page.getByRole('button', {exact: true, name: '설정'})
  await trigger.click()
  const delay = settings.getByRole('button', {name: /^스크린 세이버 /u})
  await delay.click()
  await page.getByRole('option', {exact: true, name: '1분 후'}).click()
  await expect(delay).toContainText('1분 후')
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()

  await page.reload()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await expect(page.locator('.pomo-scene-fallback')).toHaveCount(0)
  await trigger.click()
  await expect(delay).toContainText('1분 후')
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await trigger.focus()
  await page.keyboard.press('Control')
  const saver = page.getByRole('dialog', {exact: true, name: '스크린 세이버'})
  await page.waitForTimeout(55_000)
  await expect(saver).not.toBeVisible()
  await expect(saver).toBeVisible({timeout: 10_000})
  await expect(saver).toBeFocused()
  await expect(saver).toHaveJSProperty('open', true)
  await expect(saver.getByRole('region', {name: '포모도로 상태'})).toContainText('25:00')
  await expect(saver.getByRole('region', {name: '현재 음악'})).toHaveCount(0)
  await captureScreenSaver(page, information)

  await page.keyboard.press('Escape')
  await expect(saver).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await page.waitForTimeout(55_000)
  await expect(saver).not.toBeVisible()
  await expect(saver).toBeVisible({timeout: 10_000})
  // Press in place because moving first would dismiss the saver before pointerdown.
  await page.mouse.down()
  await page.mouse.up()
  await expect(saver).not.toBeVisible()
  await expect(trigger).toBeFocused()
  await trigger.click()
  await delay.click()
  await page.getByRole('option', {exact: true, name: '끄기'}).click()
  await expect(delay).toContainText('끄기')
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.reload()
  await trigger.click()
  await expect(delay).toContainText('끄기')
  await settings.getByRole('button', {exact: true, name: '닫기'}).click()
  await expect(saver).not.toBeVisible()
  await expect(trigger).toBeVisible()
  await page.waitForTimeout(61_000)
  await expect(saver).not.toBeVisible()
})
