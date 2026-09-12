import {expect, test} from '@playwright/test'

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

test('should preserve settings behind the screen saver when dismissing with Escape', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  const settings = page.getByRole('dialog', {name: 'Pomofi 설정'})
  await settings.getByRole('button', {name: /^스크린 세이버 /u}).click()
  await page.getByRole('option', {exact: true, name: '5초 후'}).click()
  const saver = page.locator('dialog.pomo-screen-saver')
  await expect(saver).toBeVisible({timeout: 8000})
  await page.keyboard.press('Escape')
  await expect(saver).not.toBeVisible()
  await expect(settings).toBeVisible()
})
