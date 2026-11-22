import '@testing-library/jest-dom/vitest'
import {Route, Router} from '@solidjs/router'
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {getLocale, overwriteGetLocale} from '@paraglide/runtime'
import * as m from '@paraglide/message'
import {createComponent} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import WhatsNewPage from '../whats-new'

const originalGetLocale = getLocale
const EXPECTED_CHANGE_COUNT = 58

afterEach(() => {
  cleanup()
  overwriteGetLocale(originalGetLocale)
  vi.restoreAllMocks()
})

test.each(['ko', 'en'] as const)(
  'should show the initial explanation from the actual %s public document',
  async (locale) => {
    overwriteGetLocale(() => locale)
    const fetch = vi.spyOn(globalThis, 'fetch')
    render(() =>
      createComponent(Router, {
        get children() {
          return createComponent(Route, {component: WhatsNewPage, path: '*'})
        },
      }),
    )
    const title = locale === 'ko' ? '첫 출시' : 'Initial release'
    const heading = await screen.findByRole('heading', {name: title})
    const article = heading.closest('article')!
    await expect
      .element(within(article).getByText(m.version_notice_initial_release()))
      .toBeVisible()
    expect(screen.getAllByText(m.version_notice_initial_release())).toHaveLength(1)
    expect(screen.getAllByRole('listitem')).toHaveLength(EXPECTED_CHANGE_COUNT)
    expect(
      fetch.mock.calls.some(([input]) => String(input).endsWith(`/versions/v2/${locale}.json`)),
    ).toBe(true)
    for (const link of screen.getAllByRole('link', {name: m.app_return()})) {
      expect(link).toHaveAttribute('href', '/')
    }
  },
)
