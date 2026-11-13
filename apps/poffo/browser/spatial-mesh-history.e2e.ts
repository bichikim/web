import {expect, type Page, test} from 'playwright/test'
import {fileURLToPath} from 'node:url'
import {readFileSync} from 'node:fs'
import type {PuppetEditorElement} from '@winter-love/puppet/editor-element'

const elementUrl = process.env.PUPPET_ELEMENT_URL ?? 'http://127.0.0.1:4180/element.html'

const prepareMesh = async (page: Page) => {
  await page.goto('/editor')
  await page.getByRole('button', {exact: true, name: '메인 메뉴'}).click()
  await page
    .getByLabel('불러오기', {exact: true})
    .setInputFiles(
      fileURLToPath(
        new URL('../../../packages/puppet/examples/rotation-skinning.json', import.meta.url),
      ),
    )
  await page.getByRole('button', {exact: true, name: '① 어깨 종류 변경'}).click()
  await page.getByRole('menuitemradio', {exact: true, name: '3D 디포머'}).click()
  const translation = page.getByRole('spinbutton', {exact: true, name: '3D 이동 X'})
  await translation.fill('10')
  await translation.press('Tab')
  await translation.fill('20')
  await translation.press('Tab')
  const open = page.getByRole('button', {exact: true, name: '메시 만들기'})
  await open.focus()
  await page.keyboard.press('Control+z')
  await expect(translation).toHaveValue('10')
  await open.click()
  const dialog = page.getByRole('dialog', {exact: true, name: '메시 편집'})
  await dialog.getByRole('button', {exact: true, name: '박스 추가'}).click()
  await expect(dialog.getByRole('button', {exact: true, name: '박스 편집'})).toBeVisible()
  return dialog
}

for (const focus of ['toolbar', 'canvas', 'checkbox', 'radio'] as const) {
  test(`should keep document history and the mesh draft when history keys target the ${focus}`, async ({
    page,
  }) => {
    const dialog = await prepareMesh(page)
    const history = page.getByLabel('작업 시점', {exact: true})
    const before = await history.innerText()
    const target = {
      canvas: dialog.getByRole('group', {exact: true, name: '3D 메시 회전 미리보기'}),
      checkbox: dialog.getByRole('checkbox', {exact: true, name: '박스 합성 선택'}),
      radio: dialog.getByRole('radio', {exact: true, name: '더하기'}),
      toolbar: dialog.getByRole('button', {exact: true, name: '회전'}),
    }[focus]
    await target.focus()
    await expect(target).toBeFocused()
    /* eslint-disable no-await-in-loop -- Each native chord must be observed before the next input. */
    for (const key of ['Control+z', 'Meta+z', 'Control+Shift+z', 'Meta+Shift+z', 'Control+y']) {
      await page.keyboard.press(key)
      await expect(history).toHaveText(before, {useInnerText: true})
      await expect(
        page.getByRole('spinbutton', {exact: true, includeHidden: true, name: '3D 이동 X'}),
      ).toHaveValue('10')
      await expect(dialog.getByRole('button', {exact: true, name: '박스 편집'})).toBeVisible()
      await expect(target).toBeFocused()
    }
    /* eslint-enable no-await-in-loop */
  })
}

test('should preserve native text undo and the modal Undo and Redo buttons', async ({page}) => {
  const dialog = await prepareMesh(page)
  const history = page.getByLabel('작업 시점', {exact: true})
  const before = await history.innerText()
  const name = dialog.getByRole('textbox', {exact: true, name: '메시 이름'})
  await name.focus()
  await name.press('End')
  await page.keyboard.type(' draft')
  await expect(name).toHaveValue('박스 draft')
  await page.keyboard.press('Control+z')
  await expect(name).toHaveValue('박스')
  await page.keyboard.press('Control+Shift+z')
  await expect(name).toHaveValue('박스 draft')
  await page.keyboard.press('Control+z')
  await expect(name).toHaveValue('박스')
  await expect(history).toHaveText(before, {useInnerText: true})
  await dialog.getByRole('button', {exact: true, name: '실행 취소'}).click()
  await expect(dialog.getByRole('button', {exact: true, name: '박스 편집'})).toHaveCount(0)
  await dialog.getByRole('button', {exact: true, name: '다시 실행'}).click()
  await expect(dialog.getByRole('button', {exact: true, name: '박스 편집'})).toBeVisible()
  await expect(history).toHaveText(before, {useInnerText: true})
})

for (const exit of ['취소', '닫기', '메시 적용', 'Escape'] as const) {
  test(`should resume document shortcuts after ${exit}`, async ({page}) => {
    const dialog = await prepareMesh(page)
    if (exit === 'Escape') {
      await page.keyboard.press('Escape')
    } else if (exit === '취소') {
      await dialog
        .getByRole('button')
        .filter({hasText: /^취소$/u})
        .click()
    } else {
      await dialog.getByRole('button', {exact: true, name: exit}).click()
    }
    await expect(dialog).toHaveCount(0)
    const open = page.getByRole('button', {
      exact: true,
      name: exit === '메시 적용' ? '메시 편집' : '메시 만들기',
    })
    await open.focus()
    const history = page.getByLabel('작업 시점', {exact: true})
    const before = await history.innerText()
    await page.keyboard.press('Control+z')
    await expect(history).not.toHaveText(before, {useInnerText: true})
    await page.keyboard.press('Control+Shift+z')
    await expect(history).toHaveText(before, {useInnerText: true})
  })
}

test('should retain document shortcuts in the separate view settings popover', async ({page}) => {
  const mesh = await prepareMesh(page)
  await mesh.getByRole('button', {exact: true, name: '닫기'}).click()
  await page.getByRole('button', {exact: true, name: '보기 설정'}).click()
  const settings = page.getByRole('dialog', {exact: true, name: '보기 설정'})
  await settings.getByRole('button', {exact: true, name: '보기 X 증가'}).focus()
  const translation = page.getByRole('spinbutton', {exact: true, name: '3D 이동 X'})
  await page.keyboard.press('Control+z')
  await expect(translation).toHaveValue('0')
  await page.keyboard.press('Control+Shift+z')
  await expect(translation).toHaveValue('10')
  await page.keyboard.press('Escape')
  await expect(settings).not.toBeVisible()
})

test('should retain instance history routing across lifecycle changes', async ({page}) => {
  await page.goto(elementUrl)
  await page.waitForFunction(() => document.querySelector('puppet-editor')?.control !== undefined)
  const model = JSON.parse(
    readFileSync(
      new URL('../../../packages/puppet/examples/rotation-skinning.json', import.meta.url),
      'utf8',
    ),
  )
  await page.evaluate((model) => {
    const first = document.querySelector('puppet-editor') as PuppetEditorElement
    first.document = model
    const second = document.createElement('puppet-editor') as PuppetEditorElement
    second.document = model
    document.body.append(second)
  }, model)
  const first = page.locator('puppet-editor').nth(0)
  const second = page.locator('puppet-editor').nth(1)
  await first.getByRole('button', {exact: true, name: '① 어깨 종류 변경'}).click()
  await first.getByRole('menuitemradio', {exact: true, name: '3D 디포머'}).click()
  const translation = first.getByRole('spinbutton', {exact: true, name: '3D 이동 X'})
  await translation.fill('10')
  await translation.press('Tab')
  await first.getByRole('button', {exact: true, name: '메시 만들기'}).focus()
  const states = () =>
    page.locator('puppet-editor').evaluateAll((editors) =>
      editors.map((editor) => {
        const state = (editor as PuppetEditorElement).state.editor!
        return {
          lifecycle: state.lifecycle,
          redo: state.redoCount,
          revision: state.revision,
          undo: state.undoCount,
        }
      }),
    )
  const before = await states()
  await first.evaluate((editor: PuppetEditorElement) => editor.control!.lifecycle.suspend())
  await page.keyboard.press('Control+z')
  expect((await states())[0]).toEqual({...before[0], lifecycle: 'suspended'})
  await first.evaluate((editor: PuppetEditorElement) => editor.control!.lifecycle.resume())
  await page.keyboard.press('Control+z')
  const resumed = await states()
  expect(resumed[0]!.undo).toBe(before[0]!.undo - 1)
  await first.evaluate((editor: PuppetEditorElement) => editor.control!.lifecycle.deactivate())
  await second.getByRole('button', {exact: true, name: '그룹'}).click()
  const secondBefore = await states()
  await page.keyboard.press('Control+z')
  const secondAfter = await states()
  expect(secondAfter[0]).toEqual({...resumed[0], lifecycle: 'inactive'})
  expect(secondAfter[1]!.undo).toBe(secondBefore[1]!.undo - 1)
  await first.evaluate((editor: PuppetEditorElement) => editor.remove())
  await page.keyboard.press('Control+Shift+z')
  expect((await states())[0]!.undo).toBe(secondBefore[1]!.undo)
})

for (const focus of ['toolbar', 'canvas', 'checkbox', 'radio'] as const) {
  test(`should preserve the document and revision for native history keys on a shadow modal ${focus}`, async ({
    page,
  }) => {
    await page.goto(elementUrl)
    await page.waitForFunction(() => document.querySelector('puppet-editor')?.control !== undefined)
    const model = JSON.parse(
      readFileSync(
        new URL('../../../packages/puppet/examples/rotation-skinning.json', import.meta.url),
        'utf8',
      ),
    )
    const editor = page.locator('puppet-editor')
    await editor.evaluate((editor: PuppetEditorElement, model) => {
      editor.document = model
    }, model)
    await editor.getByRole('button', {exact: true, name: '① 어깨 종류 변경'}).click()
    await editor.getByRole('menuitemradio', {exact: true, name: '3D 디포머'}).click()
    const translation = editor.getByRole('spinbutton', {exact: true, name: '3D 이동 X'})
    await translation.fill('10')
    await translation.press('Tab')
    await editor.getByRole('button', {exact: true, name: '메시 만들기'}).press('Enter')
    // Existing Kobalte shadow portals mark body aria-hidden; keyboard activation avoids their pointer dismissal.
    const dialog = editor.getByRole('dialog', {exact: true, includeHidden: true, name: '메시 편집'})
    await dialog
      .getByRole('button', {exact: true, includeHidden: true, name: '박스 추가'})
      .press('Enter')
    const target = {
      canvas: dialog.getByRole('group', {
        exact: true,
        includeHidden: true,
        name: '3D 메시 회전 미리보기',
      }),
      checkbox: dialog.getByRole('checkbox', {
        exact: true,
        includeHidden: true,
        name: '박스 합성 선택',
      }),
      radio: dialog.getByRole('radio', {exact: true, includeHidden: true, name: '더하기'}),
      toolbar: dialog.getByRole('button', {exact: true, includeHidden: true, name: '회전'}),
    }[focus]
    await target.focus()
    await expect(target).toBeFocused()
    const snapshot = () =>
      editor.evaluate((editor: PuppetEditorElement) => ({
        document: editor.document,
        state: editor.state.editor,
      }))
    const before = await snapshot()
    /* eslint-disable no-await-in-loop -- Each native chord must be observed before the next input. */
    for (const key of ['Control+z', 'Meta+z', 'Control+Shift+z', 'Meta+Shift+z', 'Control+y']) {
      await page.keyboard.press(key)
      expect(await snapshot()).toEqual(before)
      await expect(
        dialog.getByRole('button', {exact: true, includeHidden: true, name: '박스 편집'}),
      ).toBeVisible()
      await expect(target).toBeFocused()
    }
    /* eslint-enable no-await-in-loop */
  })
}
