import {expect, type Page, test} from 'playwright/test'
import {createDemoDocument, serializeDocument} from '@winter-love/puppet/player'
import {activateMenu, installDesktop} from './fixtures/desktop'

test.use({launchOptions: {args: []}, permissions: []})

const modelFile = () => ({
  bytes: [...Buffer.from(serializeDocument(createDemoDocument()))],
  name: 'model.json',
})

test('should open files from a native event without browser user activation', async ({page}) => {
  await installDesktop(page, {
    automaticAction: 'document-open',
    initialFile: modelFile(),
    platform: 'MacIntel',
  })
  await page.goto('/editor')
  await expect(page.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeVisible()
})

const openDocument = async (page: Page, action = 'document-open') => {
  await page.evaluate((file) => globalThis.poffoDesktop.selectFile(file), modelFile())
  await activateMenu(page, action)
}

test('should report native read failures without replacing the current model', async ({page}) => {
  await installDesktop(page, {
    automaticAction: 'document-open',
    initialFile: modelFile(),
    platform: 'MacIntel',
    rejectRead: true,
  })
  await page.goto('/editor')
  await expect(page.getByRole('alert')).toContainText('파일을 열지 못했습니다.')
  await expect(page.getByLabel('파츠 0개')).toBeVisible()
  await page.getByRole('button', {name: '알림 닫기'}).click()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

for (const platform of ['MacIntel', 'Win32'] as const) {
  test(`should move file, history and help actions to the ${platform} native menu`, async ({
    page,
  }) => {
    await installDesktop(page, {platform})
    await page.goto('/editor')
    await expect(page.getByRole('button', {exact: true, name: '모델링'})).toBeVisible()
    await expect(page.getByRole('button', {name: '메인 메뉴'})).toHaveCount(0)
    expect(await page.evaluate(() => globalThis.poffoDesktop.attachment())).toBe(
      platform === 'MacIntel' ? 'app' : 'window',
    )
    await openDocument(page)
    await expect(page.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeVisible()
    await activateMenu(page, 'undo')
    await expect(page.getByLabel('파츠 0개')).toBeVisible()
    await activateMenu(page, 'redo')
    await expect(page.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeVisible()
    const downloaded = page.waitForEvent('download')
    await activateMenu(page, 'json-export')
    expect((await downloaded).suggestedFilename()).toBe('puppet-model.json')
    await activateMenu(page, 'help-open')
    await expect(page.getByRole('heading', {name: 'Puppet 도움말'})).toBeVisible()
    await page.getByRole('button', {name: 'Dismiss'}).click()
    await expect(page.getByRole('heading', {name: 'Puppet 도움말'})).toHaveCount(0)
  })

  test(`should preserve text undo and redo without changing the model on ${platform}`, async ({
    page,
  }) => {
    await installDesktop(page, {platform})
    await page.goto('/editor')
    await openDocument(page)
    const layer = page.getByRole('button', {name: 'mesh-preview 레이어 선택'})
    await expect(layer).toBeVisible()
    const filter = page.getByRole('textbox', {name: '레이어 이름 필터'})
    await filter.pressSequentially('q')
    await expect(layer).not.toBeVisible()
    await activateMenu(page, 'undo')
    await expect(filter).toHaveValue('')
    await expect(layer).toBeVisible()
    await activateMenu(page, 'redo')
    await expect(filter).toHaveValue('q')
    await expect(layer).not.toBeVisible()
    await filter.fill('')
    await expect(layer).toBeVisible()
  })
}

test('should enable native text history even when the document has no history', async ({page}) => {
  await installDesktop(page, {platform: 'MacIntel'})
  await page.goto('/editor')
  const filter = page.getByRole('textbox', {name: '레이어 이름 필터'})
  await filter.pressSequentially('m')
  await activateMenu(page, 'undo')
  await expect(filter).toHaveValue('')
  await page.getByRole('button', {name: /^원점/u}).click()
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.poffoDesktop.items().find((item) => item.id === 'undo')?.enabled,
      ),
    )
    .toBe(false)
})

test('should route native model and studio actions only to the active workspace', async ({
  page,
}) => {
  await installDesktop(page, {platform: 'MacIntel'})
  await page.goto('/editor')
  await openDocument(page)
  await expect(page.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeVisible()
  await page.getByRole('button', {exact: true, name: 'Studio'}).click()
  await expect(page).toHaveURL(/\/studio(?:\?|$)/u)
  await expect(page.getByRole('button', {name: '메인 메뉴'})).toHaveCount(0)
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.poffoDesktop.items().find((item) => item.id === 'document-open')?.enabled,
      ),
    )
    .toBe(false)
  const downloaded = page.waitForEvent('download')
  await activateMenu(page, 'studio-save')
  expect((await downloaded).suggestedFilename()).toBe('puppet-studio.json')
  await openDocument(page, 'model-open')
  await expect(page.getByRole('region', {name: '모델 보기'}).locator('canvas')).toBeVisible()
  await page.getByRole('link', {exact: true, name: 'Viewer'}).click()
  await expect(page).toHaveURL(/\/viewer(?:\?|$)/u)
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.poffoDesktop.items().find((item) => item.id === 'studio-save')?.enabled,
      ),
    )
    .toBe(false)
  await page.getByRole('link', {exact: true, name: 'Editor'}).click()
  await expect(page.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeVisible()
  await expect
    .poll(() =>
      page.evaluate(
        () => globalThis.poffoDesktop.items().find((item) => item.id === 'model-open')?.enabled,
      ),
    )
    .toBe(false)
})

test('should retain the web menu when native initialization fails', async ({page}) => {
  await installDesktop(page, {platform: 'MacIntel', rejectInitialization: true})
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(serializeDocument(createDemoDocument())),
    mimeType: 'application/json',
    name: 'model.json',
  })
  await expect(page.getByRole('button', {name: 'mesh-preview 레이어 선택'})).toBeVisible()
})
