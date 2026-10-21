import '@unocss/reset/tailwind.css'
import {setLocale} from '@paraglide/runtime'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {commands, page} from 'vitest/browser'
import {DownloadStatus} from '../DownloadStatus'

declare module 'vitest/browser' {
  interface BrowserCommands {
    getUtilityStyles: (content: string) => Promise<string>
    setReducedMotion: (reducedMotion: 'reduce' | 'no-preference') => Promise<void>
  }
}

let stylesheet: HTMLStyleElement | undefined
const OVERRUN_PERCENTAGE = 133
const RESUMED_PERCENTAGE = 57
const MAXIMUM_PERCENTAGE = 100
const INDETERMINATE_PARTS = 3

afterEach(async () => {
  cleanup()
  stylesheet?.remove()
  stylesheet = undefined
  await commands.setReducedMotion('no-preference')
  await setLocale('ko', {reload: false})
})

it.each([
  {kind: 'text', locale: 'ko', motion: 'reduce'},
  {kind: 'voice', locale: 'ko', motion: 'no-preference'},
  {kind: 'text', locale: 'en', motion: 'no-preference'},
  {kind: 'voice', locale: 'en', motion: 'reduce'},
] as const)(
  'should respect $motion during $kind progress transitions in $locale',
  async ({kind, locale, motion}) => {
    await commands.setReducedMotion(motion)
    await setLocale(locale, {reload: false})
    const [progress, setProgress] = createSignal(OVERRUN_PERCENTAGE)
    const onCancel = vi.fn()
    render(() =>
      createComponent(DownloadStatus, {
        kind,
        onCancel,
        get progress() {
          return progress()
        },
      }),
    )

    const status = screen.getByRole('status')
    stylesheet = document.createElement('style')
    stylesheet.textContent = await commands.getUtilityStyles(status.outerHTML)
    document.head.append(stylesheet)
    const progressBar = screen.getByRole('progressbar')
    const fill = status.querySelector<HTMLElement>('div[aria-hidden="true"] > div')!
    const widthRatio = () =>
      fill.getBoundingClientRect().width / fill.parentElement!.getBoundingClientRect().width
    expect(progressBar.getAttribute('aria-valuenow')).toBe('100')
    await expect.poll(widthRatio).toBeCloseTo(1)

    setProgress(Number.NaN)
    expect(screen.getByRole('status')).toBe(status)
    expect(screen.getByRole('progressbar')).toBe(progressBar)
    expect(progressBar.hasAttribute('aria-valuenow')).toBe(false)
    expect(status.textContent).not.toContain('%')
    await expect.poll(widthRatio).toBeCloseTo(1 / INDETERMINATE_PARTS)
    expect(globalThis.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(
      motion === 'reduce',
    )
    await expect
      .poll(() => getComputedStyle(fill).animationName)
      .toBe(motion === 'reduce' ? 'none' : 'pulse')

    setProgress(RESUMED_PERCENTAGE)
    expect(progressBar.getAttribute('aria-valuenow')).toBe('57')
    expect(status.textContent).toContain('57%')
    await expect.poll(widthRatio).toBeCloseTo(RESUMED_PERCENTAGE / MAXIMUM_PERCENTAGE)
    expect(getComputedStyle(fill).animationName).toBe('none')
    await page
      .getByRole('button', {
        exact: true,
        name: locale === 'ko' ? '다운로드 취소' : 'Cancel download',
      })
      .click()
    expect(onCancel).toHaveBeenCalledOnce()
  },
)
