import {readFileSync} from 'node:fs'
import {expect, type Locator, type Page, test} from 'playwright/test'

const model = readFileSync(
  new URL('../../../packages/puppet/examples/rotation-skinning.json', import.meta.url),
  'utf8',
)

const openElement = async (page: Page, count = 1) => {
  await page.route('**/auto-mesh.html', (route) =>
    route.fulfill({
      body: `<!doctype html><html lang="ko"><body>
        ${'<puppet-editor></puppet-editor>'.repeat(count)}
        <script type="module" src="/dist/editor-element.js"></script>
      </body></html>`,
      contentType: 'text/html',
    }),
  )
  await page.goto('http://127.0.0.1:4180/auto-mesh.html')
  await page.waitForFunction(() =>
    [...document.querySelectorAll('puppet-editor')].every((editor) => editor.control !== undefined),
  )
  await page.evaluate((source) => {
    for (const editor of document.querySelectorAll('puppet-editor')) {
      editor.document = JSON.parse(source)
    }
  }, model)
  await page.waitForFunction(() =>
    [...document.querySelectorAll('puppet-editor')].every(
      (editor) => editor.state.editor?.renderer === 'ready',
    ),
  )
}

const selectPart = async (owner: Page | Locator) => {
  await owner.getByRole('button', {exact: true, name: '① 어깨 펼치기'}).click()
  await owner.getByRole('button', {exact: true, name: '위팔 · 청록 레이어 선택'}).click()
}

// includeHidden observes the existing shadow modal aria-hidden defect without changing DOM policy.
const getDialog = (owner: Page | Locator) =>
  owner.getByRole('dialog', {includeHidden: true, name: '자동 메시 생성'})

const getSnapshot = (page: Page) =>
  page.evaluate(() =>
    [...document.querySelectorAll('puppet-editor')].map((editor) => ({
      document: editor.document,
      state: editor.state,
    })),
  )

const openDialog = async (owner: Page | Locator) => {
  await owner.getByRole('button', {exact: true, name: '자동 메시'}).click()
  await expect(getDialog(owner)).toBeVisible()
}

test('should retain shadow preset clicks and cancel without changing the document', async ({
  page,
}) => {
  await openElement(page)
  await selectPart(page)
  const before = await getSnapshot(page)
  await openDialog(page)
  const dialog = getDialog(page)
  expect(await dialog.evaluate((element) => element.getRootNode() instanceof ShadowRoot)).toBe(true)
  await dialog.getByText('큰 변형', {exact: true}).click()
  await expect(dialog).toBeVisible()
  await expect(dialog.getByRole('radio', {includeHidden: true, name: '큰 변형'})).toBeChecked()
  await expect(
    dialog.getByRole('spinbutton', {includeHidden: true, name: '정점 간격'}),
  ).toHaveValue('10')
  await dialog.getByRole('button', {includeHidden: true, name: '취소'}).click()
  await expect(dialog).not.toBeVisible()
  expect(await getSnapshot(page)).toEqual(before)
  await openDialog(page)
  await expect(
    dialog.getByRole('spinbutton', {includeHidden: true, name: '정점 간격'}),
  ).toHaveValue('19')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  expect(await getSnapshot(page)).toEqual(before)
})

test('should keep shadow numeric pointer focus, native input and generation settings', async ({
  page,
}) => {
  await openElement(page)
  await selectPart(page)
  const before = await getSnapshot(page)
  await openDialog(page)
  const dialog = getDialog(page)
  const spacing = dialog.getByRole('spinbutton', {includeHidden: true, name: '정점 간격'})
  await spacing.click()
  await expect(dialog).toBeVisible()
  await expect(spacing).toBeFocused()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText('12')
  await page.keyboard.press('ArrowUp')
  await expect(spacing).toHaveValue('13')
  await page.keyboard.press('Tab')
  const alpha = dialog.getByRole('spinbutton', {includeHidden: true, name: '투명 판정값'})
  await alpha.click()
  await expect(alpha).toBeFocused()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText('24')
  await page.keyboard.press('Tab')
  await expect(alpha).toHaveValue('24')
  expect(await getSnapshot(page)).toEqual(before)
  await dialog
    .getByRole('button', {exact: true, includeHidden: true, name: '자동 메시 생성'})
    .click()
  await expect(dialog).not.toBeVisible()
  await expect.poll(async () => (await getSnapshot(page))[0].state.editor?.undoCount).toBe(1)
  const after = await getSnapshot(page)
  expect(after[0].document.parts[0].mesh.vertices.length).toBeGreaterThan(8)
  expect(after[0].state.editor?.revision).toBe(before[0].state.editor!.revision + 1)
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(async () => (await getSnapshot(page))[0].document).toEqual(before[0].document)
})

test('should apply a shadow generation button click and preserve undo and redo after closing', async ({
  page,
}) => {
  await openElement(page)
  await selectPart(page)
  const before = await getSnapshot(page)
  await openDialog(page)
  const dialog = getDialog(page)
  await dialog
    .getByRole('button', {exact: true, includeHidden: true, name: '자동 메시 생성'})
    .click()
  await expect(dialog).not.toBeVisible()
  await expect.poll(async () => (await getSnapshot(page))[0].state.editor?.undoCount).toBe(1)
  const after = await getSnapshot(page)
  expect(after[0].document.parts[0].mesh.vertices.length).toBeGreaterThan(8)
  await page.keyboard.press('ControlOrMeta+z')
  await expect.poll(async () => (await getSnapshot(page))[0].document).toEqual(before[0].document)
  await page.keyboard.press('ControlOrMeta+Shift+z')
  await expect.poll(async () => (await getSnapshot(page))[0].document).toEqual(after[0].document)
})

test('should retain actual shadow outside dismissal, Escape and close button behavior', async ({
  page,
}) => {
  await openElement(page)
  await selectPart(page)
  const before = await getSnapshot(page)
  await openDialog(page)
  const dialog = getDialog(page)
  const bounds = await dialog.boundingBox()
  expect(bounds).not.toBeNull()
  await page.mouse.click(bounds!.x - 10, bounds!.y + 10)
  await expect(dialog).not.toBeVisible()
  await openDialog(page)
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await openDialog(page)
  await dialog.getByRole('button', {includeHidden: true, name: '자동 메시 설정 닫기'}).click()
  await expect(dialog).not.toBeVisible()
  expect(await getSnapshot(page)).toEqual(before)
  await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
  await expect(page.getByRole('dialog', {name: '보기 설정'})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('button', {exact: true, name: '보기 설정'})).toBeFocused()
})

test('should isolate shadow generation and subsequent interactions across two custom elements', async ({
  page,
}) => {
  await openElement(page, 2)
  const editors = page.locator('puppet-editor')
  const first = editors.nth(0)
  const second = editors.nth(1)
  await selectPart(first)
  await selectPart(second)
  const before = await getSnapshot(page)
  await openDialog(first)
  const firstDialog = getDialog(first)
  await firstDialog.getByText('작은 변형', {exact: true}).click()
  await expect(firstDialog).toBeVisible()
  await firstDialog
    .getByRole('button', {exact: true, includeHidden: true, name: '자동 메시 생성'})
    .click()
  await expect(firstDialog).not.toBeVisible()
  await expect.poll(async () => (await getSnapshot(page))[0].state.editor?.undoCount).toBe(1)
  expect((await getSnapshot(page))[1]).toEqual(before[1])
  await openDialog(second)
  const secondDialog = getDialog(second)
  await secondDialog.getByText('큰 변형', {exact: true}).click()
  await expect(secondDialog).toBeVisible()
  await secondDialog.getByRole('button', {includeHidden: true, name: '취소'}).click()
  await expect(secondDialog).not.toBeVisible()
  expect((await getSnapshot(page))[1]).toEqual(before[1])
  await second.getByRole('button', {exact: true, name: '보기 설정'}).click()
  await expect(second.getByRole('dialog', {name: '보기 설정'})).toBeVisible()
  await page.keyboard.press('Escape')
})

test('should preserve production light DOM presets, native inputs, cancellation and application', async ({
  page,
}) => {
  await page.goto('/editor')
  await page.getByRole('button', {name: '메인 메뉴'}).click()
  await page.getByLabel('불러오기', {exact: true}).setInputFiles({
    buffer: Buffer.from(model),
    mimeType: 'application/json',
    name: 'rotation-skinning.json',
  })
  await selectPart(page)
  await openDialog(page)
  const dialog = getDialog(page)
  expect(await dialog.evaluate((element) => element.getRootNode() instanceof ShadowRoot)).toBe(
    false,
  )
  await dialog.getByText('큰 변형', {exact: true}).click()
  const spacing = dialog.getByRole('spinbutton', {name: '정점 간격'})
  await expect(spacing).toHaveValue('10')
  await spacing.click()
  await expect(spacing).toBeFocused()
  await page.keyboard.press('ControlOrMeta+A')
  await page.keyboard.insertText('12')
  await page.keyboard.press('Tab')
  await expect(spacing).toHaveValue('12')
  await dialog.getByRole('button', {name: '취소'}).click()
  await expect(dialog).not.toBeVisible()
  await openDialog(page)
  await expect(spacing).toHaveValue('19')
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await openDialog(page)
  const bounds = await dialog.boundingBox()
  expect(bounds).not.toBeNull()
  await page.mouse.click(bounds!.x - 10, bounds!.y + 10)
  await expect(dialog).not.toBeVisible()
  await openDialog(page)
  await dialog.getByRole('button', {exact: true, name: '자동 메시 생성'}).click()
  await expect(dialog).not.toBeVisible()
  const history = page.getByRole('button', {exact: true, name: '자동 메시 생성'})
  await expect(history).toHaveAttribute('aria-current', 'step')
  await page.keyboard.press('ControlOrMeta+z')
  await expect(history).not.toHaveAttribute('aria-current', 'step')
})

test.describe('native touch', () => {
  test.use({hasTouch: true})

  test('should retain shadow taps and still dismiss later outside touch and mouse interactions', async ({
    page,
  }) => {
    await openElement(page, 2)
    const first = page.locator('puppet-editor').nth(0)
    const second = page.locator('puppet-editor').nth(1)
    await selectPart(first)
    await selectPart(second)
    const before = await getSnapshot(page)
    await openDialog(first)
    const dialog = getDialog(first)
    await dialog.getByText('큰 변형', {exact: true}).tap()
    await expect(dialog).toBeVisible()
    const spacing = dialog.getByRole('spinbutton', {includeHidden: true, name: '정점 간격'})
    await expect(spacing).toHaveValue('10')
    await spacing.tap()
    await expect(spacing).toBeFocused()
    await page.keyboard.press('ControlOrMeta+A')
    await page.keyboard.insertText('12')
    await page.keyboard.press('Tab')
    await expect(spacing).toHaveValue('12')
    await dialog.getByRole('button', {includeHidden: true, name: '취소'}).tap()
    await expect(dialog).not.toBeVisible()
    expect(await getSnapshot(page)).toEqual(before)
    await openDialog(first)
    await dialog.getByRole('button', {includeHidden: true, name: '자동 메시 설정 닫기'}).tap()
    await expect(dialog).not.toBeVisible()
    await openDialog(first)
    await dialog.getByText('작은 변형', {exact: true}).tap()
    const bounds = await dialog.boundingBox()
    expect(bounds).not.toBeNull()
    await page.touchscreen.tap(bounds!.x - 10, bounds!.y + 10)
    await expect(dialog).not.toBeVisible()
    expect(await getSnapshot(page)).toEqual(before)
    await openDialog(first)
    await dialog
      .getByRole('button', {exact: true, includeHidden: true, name: '자동 메시 생성'})
      .tap()
    await expect(dialog).not.toBeVisible()
    await expect.poll(async () => (await getSnapshot(page))[0].state.editor?.undoCount).toBe(1)
    expect((await getSnapshot(page))[0].document.parts[0].mesh.vertices.length).toBeGreaterThan(8)
    expect((await getSnapshot(page))[1]).toEqual(before[1])
    await openDialog(second)
    await getDialog(second).getByText('큰 변형', {exact: true}).tap()
    await expect(getDialog(second)).toBeVisible()
    await page.mouse.click(bounds!.x - 10, bounds!.y + 10)
    await expect(getDialog(second)).not.toBeVisible()
    expect((await getSnapshot(page))[1]).toEqual(before[1])
  })
})
