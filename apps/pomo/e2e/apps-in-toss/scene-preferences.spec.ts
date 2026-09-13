import {expect, test} from '@playwright/test'

test('should restore scene choices from Toss dev storage after removing the browser copy', async ({
  page,
}, information) => {
  await page.addInitScript(() => {
    // Devtools replaces the SDK but does not create the host marker used by storage routing.
    Object.defineProperty(window, 'ReactNativeWebView', {configurable: true, value: {}})
    localStorage.setItem('PARAGLIDE_LOCALE', 'ko')
  })
  await page.goto('/')
  await page.getByRole('button', {exact: true, name: '시작하기'}).click()
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  const dialog = page.getByRole('dialog', {name: 'Pomofi 설정'})
  await dialog.getByRole('tab', {exact: true, name: '배경'}).click()
  await dialog.getByText('밤', {exact: true}).click()
  await dialog.getByText('노트북 타이핑', {exact: true}).click()
  await dialog.getByText('사용자 보기', {exact: true}).click()

  const key = 'pomo:focus-room-scene-preferences:v1'
  const preferences = {activity: 'typing', gaze: 'user', timeMode: 'night'}
  await expect
    .poll(() => page.evaluate((key) => localStorage.getItem(`__ait_storage:${key}`), key))
    .toBe(JSON.stringify(preferences))
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    JSON.stringify(preferences),
  )

  await page.evaluate((key) => localStorage.removeItem(key), key)
  await page.reload()
  await page.getByRole('button', {exact: true, name: '설정'}).click()
  await dialog.getByRole('tab', {exact: true, name: '배경'}).click()
  await expect(dialog.getByRole('radio', {exact: true, name: '밤'})).toBeChecked()
  await expect(dialog.getByRole('radio', {exact: true, name: '노트북 타이핑'})).toBeChecked()
  await expect(dialog.getByRole('radio', {exact: true, name: '사용자 보기'})).toBeChecked()
  expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBe(
    JSON.stringify(preferences),
  )
  await page.screenshot({path: information.outputPath('restored.png')})
})
