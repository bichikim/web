import {expect, test} from 'playwright/test'
import {createEmptyDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../src/tracking/create-runtime-profile'

test('should retain the latest Studio file when an older file finishes reading later', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const readText = File.prototype.text
    File.prototype.text = async function readStudioText() {
      const text = await readText.call(this)
      if (this.name === 'earlier-studio.json') {
        await new Promise<void>((resolve) => {
          globalThis.addEventListener('release-studio-read', () => resolve(), {once: true})
          globalThis.dispatchEvent(new Event('studio-read-started'))
        })
      }
      return text
    }
  })
  await page.goto('/studio')
  const manual = page.getByRole('spinbutton', {exact: true, name: '수동 입력값'})
  await expect(manual).toBeVisible()
  const profile = createRuntimeProfile(createEmptyDocument())
  const file = (name: string, value: number) => ({
    buffer: Buffer.from(JSON.stringify({...profile, inputs: {buttonValue: 0, manualValue: value}})),
    mimeType: 'application/json',
    name,
  })
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  const input = page.getByLabel('스튜디오 불러오기', {exact: true}).and(page.locator('input'))
  const reading = page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        globalThis.addEventListener('studio-read-started', () => resolve(), {once: true})
      }),
  )
  await input.setInputFiles(file('earlier-studio.json', 0.2))
  await reading
  await input.setInputFiles(file('latest-studio.json', 0.8))
  await expect(manual).toHaveValue('0.8')
  await page.evaluate(() => globalThis.dispatchEvent(new Event('release-studio-read')))
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await expect(manual).toHaveValue('0.8')
  await expect
    .poll(() =>
      page.evaluate(
        (key) => JSON.parse(sessionStorage.getItem(key) ?? '{}').inputs?.manualValue,
        `puppet:runtime-session:v1:${profile.signature}`,
      ),
    )
    .toBe(0.8)
})
