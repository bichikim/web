import {expect, test} from 'playwright/test'
import {createDemoDocument} from '@winter-love/puppet/player'
import type {PuppetEditorElement} from '@winter-love/puppet/editor-element'

test('should bind a DOM host and preserve shadow popover focus across reset and reconnection', async ({
  page,
}) => {
  await page.goto('http://127.0.0.1:4180/element.html')
  await page.waitForFunction(() => document.querySelector('puppet-editor')?.control !== undefined)
  await page.evaluate(async (document) => {
    const editor = globalThis.document.querySelector('puppet-editor') as PuppetEditorElement
    editor.document = document
    const result = editor.control!.commands.selectMode('animation')
    if (result.status === 'accepted') {
      await result.operation.finished
    }
  }, createDemoDocument())
  await page.waitForFunction(
    () => document.querySelector('puppet-editor')?.state.editor?.renderer === 'ready',
  )
  const settings = page.getByRole('button', {exact: true, name: '모션 설정'})
  await settings.click()
  const dialog = page.getByRole('dialog', {name: '모션 설정'})
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate((element) => element.getRootNode() instanceof ShadowRoot)).toBe(true)
  await page.getByRole('textbox', {name: '모션 표시 이름'}).focus()
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(settings).toBeFocused()
  const menu = page.getByRole('button', {exact: true, name: '모션 관리'})
  await menu.click()
  await expect(page.getByRole('menu', {name: '모션 관리'})).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(menu).toBeFocused()
  const result = await page.evaluate(() => {
    const editor = document.querySelector('puppet-editor') as PuppetEditorElement
    const old = editor.control!
    const copy = editor.document
    Object.assign(copy, {framesPerSecond: 96})
    const detached = editor.document.framesPerSecond !== 96
    editor.remove()
    document.body.append(editor)
    return {
      detached,
      different: editor.control !== old,
      stale: old.commands.undo(),
      undoCount: editor.state.editor?.undoCount,
    }
  })
  expect(result).toEqual({
    detached: true,
    different: true,
    stale: {reason: 'stale-instance', status: 'rejected'},
    undoCount: 0,
  })
})
