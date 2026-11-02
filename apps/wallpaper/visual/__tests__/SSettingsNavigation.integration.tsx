import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, it} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SSettingsNavigation} from '../../src/components/SSettingsNavigation'
import 'virtual:uno.css'

afterEach(cleanup)

it.each([400, 520, 560, 900])(
  'should separate page navigation from scrolling content and support keyboard selection at %spx',
  async (width) => {
    await page.viewport(width, 540)
    render(() => (
      <SSettingsNavigation>
        {(page) => (
          <div class="grid h-300 content-between">
            <button type="button">{page} 첫 항목</button>
            <button type="button">{page} 마지막 항목</button>
          </div>
        )}
      </SSettingsNavigation>
    ))
    const navigation = screen.getByRole('navigation', {name: '설정 화면'})
    const widgets = within(navigation).getByRole('button', {name: '위젯'})
    widgets.focus()
    await userEvent.keyboard('{Enter}')
    expect(widgets).toHaveAttribute('aria-current', 'page')
    const panel = screen.getByRole('region', {name: '위젯 설정'})
    const before = navigation.getBoundingClientRect()
    const bounds = panel.getBoundingClientRect()
    if (width >= 520) {
      expect(before.right).toBeLessThanOrEqual(bounds.left)
    } else {
      expect(before.bottom).toBeLessThanOrEqual(bounds.top)
    }
    within(panel).getByRole('button', {name: 'widget 마지막 항목'}).focus()
    await expect.poll(() => panel.scrollTop).toBeGreaterThan(0)
    expect(navigation.getBoundingClientRect().toJSON()).toEqual(before.toJSON())
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
    await userEvent.click(within(navigation).getByRole('button', {name: '일반'}))
    expect(screen.getByRole('heading', {level: 2, name: '일반'})).toBeVisible()
    expect(screen.queryByRole('region', {name: '위젯 설정'})).toBeNull()
  },
)
