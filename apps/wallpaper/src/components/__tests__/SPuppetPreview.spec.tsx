/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, test, vi} from 'vitest'
import {usePuppet} from '../../features/background/use-puppet'
import {SPuppetPreview} from '../SPuppetPreview'

vi.mock('../../features/background/use-puppet', () => ({usePuppet: vi.fn()}))
beforeEach(() => {
  vi.mocked(usePuppet).mockReturnValue({
    cancel: vi.fn(),
    canvasKey: () => document,
    finish: vi.fn(),
    lostCapture: vi.fn(),
    move: vi.fn(),
    ready: () => true,
    start: vi.fn(),
  })
})
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})
test('should keep the preview canvas mounted across rapid asset changes', () => {
  const [assetId, setAssetId] = createSignal('first')
  render(() => <SPuppetPreview assetId={assetId} load={vi.fn()} />)
  const canvas = screen.getByRole('group', {name: 'Poffo 위치'}).querySelector('canvas')
  setAssetId('second')
  setAssetId('first')
  setAssetId('second')
  expect(screen.getByRole('group', {name: 'Poffo 위치'}).querySelector('canvas')).toBe(canvas)
  expect(usePuppet).toHaveBeenCalledOnce()
  expect(vi.mocked(usePuppet).mock.lastCall?.[0].assetId()).toBe('second')
})

test('should replace the Canvas only after a different asset finishes preparation', () => {
  const [key, setKey] = createSignal<object>({})
  vi.mocked(usePuppet).mockReturnValue({
    cancel: vi.fn(),
    canvasKey: key,
    finish: vi.fn(),
    lostCapture: vi.fn(),
    move: vi.fn(),
    ready: () => true,
    start: vi.fn(),
  })
  render(() => <SPuppetPreview assetId={() => 'first'} load={vi.fn()} />)
  const preview = screen.getByRole('group', {name: 'Poffo 위치'})
  const canvas = preview.querySelector('canvas')
  setKey({})
  expect(screen.getByRole('group', {name: 'Poffo 위치'})).toBe(preview)
  expect(preview.querySelector('canvas')).not.toBe(canvas)
  expect(usePuppet).toHaveBeenCalledOnce()
})
