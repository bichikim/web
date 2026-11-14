import '@unocss/reset/tailwind.css'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {commands, page} from 'vitest/browser'
import {SajuForm} from '../SajuForm'

declare module 'vitest/browser' {
  interface BrowserCommands {
    getUtilityStyles: (content: string) => Promise<string>
  }
}

let stylesheet: HTMLStyleElement | undefined
const MOBILE_VIEWPORT_WIDTH = 390
const DESKTOP_VIEWPORT_WIDTH = 1280
const VIEWPORT_HEIGHT = 900
const CONTROL_MINIMUM_HEIGHT = 44

afterEach(() => {
  cleanup()
  stylesheet?.remove()
  stylesheet = undefined
})

it.each([MOBILE_VIEWPORT_WIDTH, DESKTOP_VIEWPORT_WIDTH])(
  'should keep the generation and reset controls in place at %ipx when cancellation appears',
  async (width) => {
    await page.viewport(width, VIEWPORT_HEIGHT)
    const [busy, setBusy] = createSignal(false)
    const onCancel = vi.fn(() => setBusy(false))
    const persistence = {delete: vi.fn(), read: () => null, write: vi.fn()}
    const onSubmit = vi.fn(() => setBusy(true))
    render(() =>
      createComponent(SajuForm, {
        get busy() {
          return busy()
        },
        draftPersistence: persistence,
        get onCancel() {
          return busy() ? onCancel : undefined
        },
        onSubmit,
      }),
    )
    const idleMarkup = document.body.outerHTML
    setBusy(true)
    stylesheet = document.createElement('style')
    stylesheet.textContent = await commands.getUtilityStyles(
      `${idleMarkup} ${document.body.outerHTML}`,
    )
    document.head.append(stylesheet)
    setBusy(false)

    const generate = screen.getByRole('button', {name: '사주 풀이 생성'})
    const reset = screen.getByRole('button', {name: '입력 지우기'})
    const form = generate.closest('form')!
    const before = {
      form: form.getBoundingClientRect().height,
      generate: generate.getBoundingClientRect().toJSON(),
      reset: reset.getBoundingClientRect().toJSON(),
    }
    await page.getByRole('textbox', {name: '질문'}).fill('제 일은 어떨까요?')
    await page.getByRole('button', {name: '사주 풀이 생성'}).click()
    await expect.element(page.getByRole('button', {exact: true, name: '취소'})).toBeVisible()

    expect(reset.getBoundingClientRect().toJSON()).toEqual(before.reset)
    expect(generate.getBoundingClientRect().toJSON()).toEqual(before.generate)
    expect(form.getBoundingClientRect().height).toBe(before.form)
    expect(reset.getBoundingClientRect().height).toBeGreaterThanOrEqual(CONTROL_MINIMUM_HEIGHT)
    expect(reset).toBeDisabled()
    expect(onSubmit).toHaveBeenCalledOnce()

    await page.getByRole('button', {exact: true, name: '취소'}).click()
    expect(onCancel).toHaveBeenCalledOnce()
    expect(reset).toBeEnabled()
    expect(reset.getBoundingClientRect().toJSON()).toEqual(before.reset)
    expect(generate.getBoundingClientRect().toJSON()).toEqual(before.generate)
  },
)
