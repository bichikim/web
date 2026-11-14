/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import type {PoffoTracking} from '@winter-love/wallpaper/settings/tracking'
import {usePuppet} from '../../features/background/use-puppet'
import {SPoffoTrackingPreview} from '../SPoffoTrackingPreview'

vi.mock('../../features/background/use-puppet', () => ({usePuppet: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should retain one canvas and renderer while switching tracking inputs and camera calibration', () => {
  const [mode, setMode] = createSignal<PoffoTracking>('off')
  const surface = {aspect: 2, height: 0.5, left: 0.2, top: 0.1, width: 0.25}
  render(() => (
    <SPoffoTrackingPreview
      mode={mode()}
      assetId={() => 'character'}
      load={vi.fn()}
      cameraSurface={surface}
      characterAspect={0.75}
      calibrating
      onChange={vi.fn()}
    />
  ))
  const canvas = screen.getByRole('group', {name: 'Poffo 위치'}).querySelector('canvas')
  const rendering = vi.mocked(usePuppet).mock.lastCall![0]
  expect(usePuppet).toHaveBeenCalledOnce()
  expect(rendering.tracking?.()).toBe('off')
  expect(rendering.cameraSurface?.()).toBeUndefined()
  setMode('camera')
  expect(screen.getByRole('region', {name: '카메라 위치 미리보기'}).contains(canvas)).toBe(true)
  expect(screen.getByRole('button', {name: '얼굴 기준 조정'})).toBeDefined()
  expect(rendering.tracking?.()).toBe('camera')
  expect(rendering.cameraSurface?.()).toEqual(surface)
  setMode('cursor')
  expect(screen.queryByRole('region', {name: '카메라 위치 미리보기'})).toBeNull()
  expect(screen.queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  expect(screen.queryByRole('button', {name: '얼굴 기준 조정'})).toBeNull()
  expect(rendering.cameraSurface?.()).toBeUndefined()
  expect(rendering.tracking?.()).toBe('cursor')
  setMode('camera')
  setMode('off')
  expect(screen.getByRole('group', {name: 'Poffo 위치'}).querySelector('canvas')).toBe(canvas)
  expect(document.querySelectorAll('canvas')).toHaveLength(1)
  expect(usePuppet).toHaveBeenCalledOnce()
  expect(rendering.tracking?.()).toBe('off')
})
