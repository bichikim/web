import {expect, test} from 'playwright/test'
import {createEmptyDocument, serializeDocument} from '@winter-love/puppet/player'
import {createRuntimeProfile} from '../src/tracking/create-runtime-profile'

test.beforeEach(async ({page}) => {
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
})

test('should retain the latest Studio file when an older file finishes reading later', async ({
  page,
}) => {
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

test('should show a retry notice when a Studio file is still reading at model replacement', async ({
  page,
}) => {
  await page.goto('/studio')
  const manual = page.getByRole('spinbutton', {exact: true, name: '수동 입력값'})
  await expect(manual).toBeVisible()
  const profile = createRuntimeProfile(createEmptyDocument())
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  const input = page.getByLabel('스튜디오 불러오기', {exact: true}).and(page.locator('input'))
  const reading = page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        globalThis.addEventListener('studio-read-started', () => resolve(), {once: true})
      }),
  )
  await input.setInputFiles({
    buffer: Buffer.from(JSON.stringify({...profile, inputs: {buttonValue: 0, manualValue: 0.8}})),
    mimeType: 'application/json',
    name: 'earlier-studio.json',
  })
  await reading

  const replacement = {
    ...createEmptyDocument(),
    parameters: [{defaultValue: 0, id: 'replacement', maximum: 1, minimum: 0, name: 'Replacement'}],
  }
  await page
    .getByLabel('모델 불러오기', {exact: true})
    .and(page.locator('input'))
    .setInputFiles({
      buffer: Buffer.from(serializeDocument(replacement)),
      mimeType: 'application/json',
      name: 'replacement.json',
    })
  const notice = page.getByText('모델이 바뀌었습니다. 스튜디오 파일을 다시 선택해 주세요.')
  try {
    await expect(notice).toBeVisible()
  } finally {
    await page.evaluate(() => globalThis.dispatchEvent(new Event('release-studio-read')))
  }
  await expect(manual).toHaveValue('0')
})
