import {cleanup, fireEvent, render, screen, within} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {page, userEvent} from 'vitest/browser'
import {SSettingsNavigation} from '../../src/components/SSettingsNavigation'
import {createResource} from 'solid-js'
import 'virtual:uno.css'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

const SlowPage = (props: {readonly ready: Promise<string>; readonly onStart: () => void}) => {
  const [content] = createResource(() => props.ready)
  props.onStart()
  return <button>{content()}</button>
}

it('should clear stale content and show a viewport loader while the requested page is suspended', async () => {
  await page.viewport(520, 540)
  const ready = Promise.withResolvers<string>()
  const started = Promise.withResolvers<void>()
  render(() => (
    <SSettingsNavigation>
      {(page) =>
        page === 'widget' ? (
          <SlowPage ready={ready.promise} onStart={started.resolve} />
        ) : (
          <div class="h-400">
            <input aria-label="Previous draft" value="unsaved" />
          </div>
        )
      }
    </SSettingsNavigation>
  ))
  const input = screen.getByRole('textbox', {name: 'Previous draft'})
  const scroll = screen.getByRole('region', {name: '배경 설정 내용'})
  scroll.scrollTop = 300
  try {
    await userEvent.click(screen.getByRole('combobox', {name: '설정 화면 선택'}))
    await userEvent.click(screen.getByRole('option', {name: '위젯'}))
    await started.promise
    expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('위젯')
    const mask = input.closest<HTMLElement>('[aria-hidden="true"]')!
    expect(input.isConnected).toBe(true)
    expect(input).toHaveValue('unsaved')
    expect(getComputedStyle(mask).opacity).toBe('0')
    expect(mask.inert).toBe(true)
    expect(screen.queryByRole('textbox', {name: 'Previous draft'})).toBeNull()
    const loader = screen.getByRole('status', {name: '페이지 전환 중'})
    expect(loader.closest('[inert]')).toBeNull()
    expect(getComputedStyle(loader).opacity).toBe('1')
    const header = screen.getByRole('navigation', {name: '위젯 설정 경로'}).getBoundingClientRect()
    const bounds = loader.getBoundingClientRect()
    expect(bounds.top).toBeGreaterThanOrEqual(header.bottom)
    expect(bounds.bottom).toBeLessThanOrEqual(innerHeight)
    await userEvent.click(screen.getByRole('combobox', {name: '설정 화면 선택'}))
    expect(screen.getByRole('option', {name: '일반'})).toBeInTheDocument()
    await userEvent.keyboard('{Escape}')
    ready.resolve('widget ready')
    await expect.poll(() => screen.queryByRole('button', {name: 'widget ready'})).not.toBeNull()
    expect(screen.queryByRole('status', {name: '페이지 전환 중'})).toBeNull()
    expect(screen.getByRole('region', {name: '위젯 설정 내용'}).inert).toBe(false)
  } finally {
    ready.resolve('widget ready')
  }
}, 15_000)

it('should finish a selected page when the window is covered before the next paint', async () => {
  render(() => (
    <SSettingsNavigation>
      {(page) => <button type="button">{page} 첫 항목</button>}
    </SSettingsNavigation>
  ))
  await userEvent.click(screen.getByRole('combobox', {name: '설정 화면 선택'}))
  // A covered WebView suspends animation frames but still delivers visibility events.
  vi.stubGlobal(
    'requestAnimationFrame',
    vi.fn(() => 1),
  )
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  fireEvent.click(screen.getByRole('option', {name: '위젯'}))
  vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden')
  document.dispatchEvent(new Event('visibilitychange'))
  await expect.poll(() => screen.queryByRole('button', {name: 'widget 첫 항목'})).not.toBeNull()
  const content = screen.getByRole('region', {name: '위젯 설정 내용'})
  expect(content).toHaveAttribute('aria-busy', 'false')
  expect(content.inert).toBe(false)
  expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('위젯')
})

it.each([400, 520, 560, 900])(
  'should separate page navigation from scrolling content and support keyboard selection at %spx',
  async (width) => {
    await page.viewport(width, 540)
    const view = render(() => (
      <SSettingsNavigation>
        {(page) => (
          <div class="grid h-300 content-between">
            <button type="button">{page} 첫 항목</button>
            <button type="button">{page} 마지막 항목</button>
          </div>
        )}
      </SSettingsNavigation>
    ))
    expect(screen.queryByRole('navigation', {name: '설정 화면'})).toBeNull()
    screen.getByRole('combobox', {name: '설정 화면 선택'}).focus()
    await userEvent.keyboard('{ArrowDown}{ArrowDown}{Enter}')
    const navigation = screen.getByRole('navigation', {name: '위젯 설정 경로'})
    expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('위젯')
    const panel = await screen.findByRole('region', {name: '위젯 설정'})
    await expect.poll(() => screen.queryByRole('button', {name: 'widget 첫 항목'})).not.toBeNull()
    const content = screen.getByRole('region', {name: '위젯 설정 내용'})
    await expect.poll(() => content.getAttribute('aria-busy')).toBe('false')
    const before = navigation.getBoundingClientRect()
    const bounds = panel.getBoundingClientRect()
    const frame = view.container.firstElementChild!.getBoundingClientRect()
    expect(bounds.left).toBe(frame.left)
    expect(bounds.width).toBe(frame.width)
    expect(before.bottom).toBeLessThanOrEqual(content.getBoundingClientRect().top)
    within(panel).getByRole('button', {name: 'widget 마지막 항목'}).focus()
    await expect.poll(() => content.scrollTop).toBeGreaterThan(0)
    expect(navigation.getBoundingClientRect().toJSON()).toEqual(before.toJSON())
    expect(panel.scrollWidth).toBeLessThanOrEqual(panel.clientWidth)
    expect(document.documentElement.scrollWidth).toBeLessThanOrEqual(width)
    await userEvent.click(screen.getByRole('combobox', {name: '설정 화면 선택'}))
    await userEvent.click(screen.getByRole('option', {name: '일반'}))
    expect(screen.getByRole('combobox', {name: '설정 화면 선택'})).toHaveTextContent('일반')
    await screen.findByRole('region', {name: '일반 설정'})
    expect(screen.queryByRole('region', {name: '위젯 설정'})).toBeNull()
  },
)
