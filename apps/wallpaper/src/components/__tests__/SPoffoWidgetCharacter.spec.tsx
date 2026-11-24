/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {usePuppet} from '../../features/background/use-puppet'
import {useWidgetHitTest} from '../../features/poffo/use-widget-hit-test'
import {SPoffoWidgetCharacter} from '../SPoffoWidgetCharacter'

vi.mock('../../features/background/use-puppet', () => ({usePuppet: vi.fn()}))
vi.mock('../../features/poffo/use-widget-hit-test', () => ({useWidgetHitTest: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should replace the loading silhouette only when the complete character frame becomes ready', () => {
  const [ready, setReady] = createSignal(false)
  vi.mocked(usePuppet).mockReturnValue({
    cancel: vi.fn(),
    canvasKey: () => document,
    finish: vi.fn(),
    lostCapture: vi.fn(),
    move: vi.fn(),
    ready,
    start: vi.fn(),
  })
  vi.mocked(useWidgetHitTest).mockReturnValue({afterRender: vi.fn(), alphaCapture: undefined})
  render(() => (
    <SPoffoWidgetCharacter
      assetId={() => 'builtin:ash'}
      interactive={() => false}
      load={async () => ''}
      onError={vi.fn()}
    />
  ))
  const canvas = screen.getByLabelText('Poffo 배경')
  const loading = screen.getByRole('status', {name: '캐릭터 불러오는 중'})
  expect(
    loading
      .querySelector<HTMLElement>('[aria-hidden="true"]')
      ?.style.getPropertyValue('--widget-silhouette')
      .includes('data:image/webp'),
  ).toBe(true)
  expect(canvas).toHaveAttribute('aria-hidden', 'true')
  expect(canvas).toHaveClass('invisible')
  expect(vi.mocked(useWidgetHitTest).mock.lastCall![0].interactive()).toBe(false)
  expect(vi.mocked(useWidgetHitTest).mock.lastCall![0].ready?.()).toBe(false)
  setReady(true)
  expect(screen.queryByRole('status')).toBeNull()
  expect(canvas).not.toHaveClass('invisible')
  expect(canvas).toHaveAttribute('aria-hidden', 'false')
  expect(vi.mocked(useWidgetHitTest).mock.lastCall![0].interactive()).toBe(false)
  setReady(false)
  expect(screen.getByRole('status', {name: '캐릭터 불러오는 중'})).toBeInTheDocument()
  expect(canvas).toHaveClass('invisible')
})
