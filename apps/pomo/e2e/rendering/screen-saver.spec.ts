import {expect, test} from '@playwright/test'

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
