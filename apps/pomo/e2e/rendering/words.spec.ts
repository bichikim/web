import {expect, type Page, test, type TestInfo} from '@playwright/test'

const captureWords = async (page: Page, information: TestInfo, name: string) => {
  await page.clock.runFor(200)
  await page.evaluate(async () => {
    await document.fonts.ready
    await Promise.all(
      Array.from(document.images)
        .filter((image) => image.getBoundingClientRect().width > 0)
        .map((image) => image.decode()),
    )
  })
  await expect.soft(page).toHaveScreenshot(`${name}.png`, {animations: 'disabled'})
  const current = information.outputPath(`${name}-current.png`)
  await page.screenshot({animations: 'disabled', path: current})
  await information.attach(name, {contentType: 'image/png', path: current})
  const environment = await page.evaluate(() => ({
    devicePixelRatio,
    fonts: Array.from(document.fonts).map((font) => ({family: font.family, status: font.status})),
    locale: navigator.language,
    theme: document.documentElement.className,
    time: new Date().toISOString(),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    userAgent: navigator.userAgent,
    viewport: {height: innerHeight, width: innerWidth},
  }))
  await information.attach(`${name}-environment`, {
    body: JSON.stringify(environment),
    contentType: 'application/json',
  })
}

const openWords = async (page: Page) => {
  await page.getByRole('button', {exact: true, name: '기억보조'}).click()
  const dialog = page.getByRole('dialog', {exact: true, name: 'Pomofi 기억 보조'})
  await dialog.getByRole('tab', {exact: true, name: '학습 단어'}).click()
  await expect(dialog.getByRole('textbox', {name: '모르는 단어'})).toBeVisible()
  return dialog
}

test('should persist saved words, memorized filters, and deletion after reload', async ({
  page,
}, information) => {
  await page.clock.install({time: new Date('2026-09-09T00:00:00.000Z')})
  // Keep unrelated random playback out of the background while retaining the real word storage.
  await page.addInitScript(() => {
    localStorage.setItem(
      'pomo:focus-room-playlist:v1',
      JSON.stringify({savedAt: 1788912000000, trackIds: [], version: 1}),
    )
  })
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await expect(page.locator('.pomo-scene canvas')).toBeVisible()
  await expect(page.getByRole('status', {name: /장면 준비/u})).toHaveCount(0)
  const dialog = await openWords(page)
  const input = dialog.getByRole('textbox', {name: '모르는 단어'})
  await input.fill('Home,home,wave,asset')
  await dialog.getByRole('button', {exact: true, name: '단어 저장'}).click()
  await expect(dialog.getByRole('tab', {exact: true, name: '전체 3'})).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(input).toBeEmpty()
  await expect(dialog.getByRole('button', {exact: true, name: 'home'})).toHaveCount(0)
  const home = dialog.getByRole('button', {exact: true, name: 'Home'})
  const wave = dialog.getByRole('button', {exact: true, name: 'wave'})
  await home.click()
  await wave.click()
  await expect(home).toHaveAttribute('aria-pressed', 'true')
  await expect(wave).toHaveAttribute('aria-pressed', 'true')
  await expect(dialog.getByRole('button', {name: '선택한 2개 단어 삭제'})).toBeEnabled()
  await page.clock.pauseAt(new Date('2026-09-09T00:01:00.000Z'))
  await page.clock.runFor(1000)
  await captureWords(page, information, 'words-selected-dark')

  await dialog.getByRole('button', {name: '선택한 2개 단어를 외운 단어로 이동'}).click()
  await expect(home).toHaveAttribute('aria-pressed', 'false')
  await expect(dialog.getByRole('button', {name: '선택한 0개 단어 삭제'})).toBeDisabled()
  await dialog.getByRole('tab', {exact: true, name: '외울 단어 1'}).click()
  await expect(home).toHaveCount(0)
  await expect(wave).toHaveCount(0)
  await expect(dialog.getByRole('button', {exact: true, name: 'asset'})).toBeVisible()
  await dialog.getByRole('tab', {exact: true, name: '외운 단어 2'}).click()
  await expect(home).toBeVisible()
  await expect(wave).toBeVisible()
  await expect(dialog.getByRole('button', {exact: true, name: 'asset'})).toHaveCount(0)
  await captureWords(page, information, 'words-memorized-dark')

  await page.clock.resume()
  await page.reload()
  await openWords(page)
  await expect(dialog.getByRole('tab', {exact: true, name: '전체 3'})).toBeVisible()
  await dialog.getByRole('tab', {exact: true, name: '외운 단어 2'}).click()
  await home.click()
  await dialog.getByRole('button', {name: '선택한 1개 단어를 외울 단어로 이동'}).click()
  await expect(home).toHaveCount(0)
  await expect(dialog.getByRole('tab', {exact: true, name: '외운 단어 1'})).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await wave.click()
  await dialog.getByRole('button', {name: '선택한 1개 단어 삭제'}).click()
  await expect(wave).toHaveCount(0)
  await expect(dialog.getByText('외운 단어가 없어요.', {exact: true})).toBeVisible()

  await page.reload()
  await openWords(page)
  await expect(dialog.getByRole('tab', {exact: true, name: '전체 2'})).toHaveAttribute(
    'aria-selected',
    'true',
  )
  await expect(dialog.getByRole('tab', {exact: true, name: '외울 단어 2'})).toBeVisible()
  await expect(home).toBeVisible()
  await expect(dialog.getByRole('button', {exact: true, name: 'asset'})).toBeVisible()
  await expect(wave).toHaveCount(0)
  await expect(dialog.getByRole('button', {name: '선택한 0개 단어 삭제'})).toBeDisabled()
  await dialog.getByRole('button', {exact: true, name: '닫기'}).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', {exact: true, name: '기억보조'})).toBeFocused()
})
