import {expect, test} from '@playwright/test'
import {enterFocusRoom} from '../helpers/settings'

test('keeps composed text in the dialogue input when Enter is delivered during composition', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem(
      'pomo:focus-room-display-preferences:v1',
      JSON.stringify({dialogueComposerVisible: true}),
    )
  })
  await page.goto('/')
  await enterFocusRoom(page)
  await page.getByRole('button', {name: '대화 시작하기'}).click()
  const input = page.getByRole('textbox', {name: '대화 입력'})
  await input.fill('한글 조합')
  const wasCancelled = await input.evaluate(
    (element) =>
      !element.dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          isComposing: true,
          key: 'Enter',
        }),
      ),
  )
  expect(wasCancelled).toBe(true)
  await expect(input).toHaveValue('한글 조합')
  await expect(input).toBeFocused()
})
