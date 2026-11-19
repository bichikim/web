/** @vitest-environment jsdom */

import {render, screen} from '@solidjs/testing-library'

import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {DesktopSurfaceFrame} from '../Frame'

vi.mock('@solidjs/meta', () => ({Title: (props: {readonly children?: unknown}) => props.children}))

vi.mock('../../../features/desktop-mode', () => ({useDesktopSurfaceSize: vi.fn()}))

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
})

afterEach(() => {
  vi.useRealTimers()
  document.documentElement.style.removeProperty('background')
  document.body.style.removeProperty('background')
})
it('should render frame content only while its surface is visible', () => {
  document.body.style.background = 'red'
  const hidden = render(() => (
    <DesktopSurfaceFrame accessibleLabel="표면" isVisible={false} title="제목">
      <p>내용</p>
    </DesktopSurfaceFrame>
  ))
  expect(hidden.container.querySelector('main')).toHaveClass(
    'pomo-desktop-surface',
    '[&_*:not(:focus-visible)]:shadow-none',
  )
  expect(document.documentElement.style.getPropertyValue('background')).toBe('')
  expect(document.body.style.getPropertyValue('background')).toBe('red')
  expect(screen.queryByText('내용')).not.toBeInTheDocument()

  hidden.unmount()
  expect(document.body.style.getPropertyValue('background')).toBe('red')
  render(() => (
    <DesktopSurfaceFrame
      accessibleLabel="표면"
      class="custom"
      contentClass="w-full"
      isVisible
      title="제목"
    >
      <p>내용</p>
    </DesktopSurfaceFrame>
  ))
  const region = screen.getByRole('region', {name: '표면'})
  const handle = screen.getByRole('button', {name: '제목 이동 손잡이'})
  expect(region).not.toHaveAttribute('data-tauri-drag-region')
  expect(handle).toHaveAttribute('data-tauri-drag-region')
  expect(handle).toHaveClass('cursor-move')
  expect(region).toHaveClass('custom')
  expect(region.firstElementChild?.nextElementSibling).toHaveClass('w-full')
})
