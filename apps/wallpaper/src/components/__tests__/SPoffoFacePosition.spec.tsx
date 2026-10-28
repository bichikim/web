/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import type {PoffoTrackingOptions} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoFacePosition} from '../SPoffoFacePosition'

vi.mock('../../features/background/use-puppet', () => ({usePuppet: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should drag the face anchor over the rendered character and save on release', () => {
  const save = vi.fn()
  render(() => <SPoffoFacePosition onChange={save} />)
  const handle = screen.getByRole('button', {name: '캐릭터 얼굴 기준 조정'})
  vi.spyOn(handle.parentElement!, 'getBoundingClientRect').mockReturnValue({
    height: 100,
    width: 200,
  } as DOMRect)
  Object.defineProperty(handle, 'hasPointerCapture', {value: vi.fn(() => true)})
  Object.defineProperty(handle, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(handle, 'releasePointerCapture', {value: vi.fn()})
  const pointer = (type: string, x: number, y: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y})
    Object.defineProperty(event, 'pointerId', {value: 1})
    return event
  }
  fireEvent(handle, pointer('pointerdown', 100, 50))
  fireEvent(handle, pointer('pointermove', 140, 30))
  expect(save).not.toHaveBeenCalled()
  fireEvent(handle, pointer('pointerup', 140, 30))
  expect(save.mock.lastCall?.[0].faceX).toBeCloseTo(0.7)
  expect(save.mock.lastCall?.[0].faceY).toBeCloseTo(0.1)
})
test('should move the face anchor without changing camera calibration', () => {
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({
    cameraX: -0.2,
    faceX: 0.5,
    faceY: 0.3,
  })
  render(() => <SPoffoFacePosition value={options()} onChange={setOptions} />)
  fireEvent.keyDown(screen.getByRole('button', {name: '캐릭터 얼굴 기준 조정'}), {key: 'ArrowDown'})
  expect(options()).toEqual({cameraX: -0.2, faceX: 0.5, faceY: 0.31})
})
