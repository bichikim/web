/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'
import {usePuppet} from '../../features/background/use-puppet'
import {SPoffoCalibrationPreview} from '../SPoffoCalibrationPreview'

vi.mock('../../features/background/use-puppet', () => ({usePuppet: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should reveal both handles only while calibrating and preserve the canvas and saved options', () => {
  const save = vi.fn()
  render(() => (
    <SPoffoCalibrationPreview assetId={() => 'character'} load={vi.fn()} onChange={save} />
  ))
  const canvas = screen.getByRole('group', {name: 'Poffo 위치'}).querySelector('canvas')
  expect(screen.queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  expect(screen.queryByRole('button', {name: '캐릭터 얼굴 기준 조정'})).toBeNull()
  expect(screen.queryByRole('button', {name: '화면 밖 보기'})).toBeNull()
  expect(screen.getByRole('region', {name: '시선 보정 설정'})).toBeDefined()
  const toggle = screen.getByRole('button', {name: '위치 핸들 표시'})
  expect(toggle.getAttribute('aria-pressed')).toBe('false')
  fireEvent.click(toggle)
  expect(screen.getByRole('button', {name: '카메라 위치 조정'})).toBeDefined()
  expect(screen.getByRole('button', {name: '캐릭터 얼굴 기준 조정'})).toBeDefined()
  fireEvent.click(screen.getByRole('radio', {name: '얼굴'}))
  expect(screen.queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  expect(screen.queryByRole('button', {name: '캐릭터 얼굴 기준 조정'})).toBeNull()
  expect(screen.getByRole('group', {name: 'Poffo 위치'}).querySelector('canvas')).toBe(canvas)
  fireEvent.click(screen.getByRole('radio', {name: '위치'}))
  expect(screen.getByRole('button', {name: '카메라 위치 조정'})).toBeDefined()
  const done = screen.getByRole('button', {name: '위치 핸들 숨기기'})
  expect(done.getAttribute('aria-pressed')).toBe('true')
  fireEvent.click(done)
  expect(screen.queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  expect(screen.queryByRole('button', {name: '캐릭터 얼굴 기준 조정'})).toBeNull()
  expect(screen.getByRole('group', {name: 'Poffo 위치'}).querySelector('canvas')).toBe(canvas)
  expect(save).not.toHaveBeenCalled()
  expect(screen.getByRole('region', {name: '시선 보정 설정'})).toBeDefined()
  expect(screen.getByRole('button', {name: '위치 핸들 표시'})).toBe(toggle)
})

test('should exit calibration when selecting another target with the same character', () => {
  const [target, setTarget] = createSignal('first')
  render(() => (
    <SPoffoCalibrationPreview
      targetId={target()}
      assetId={() => 'character'}
      load={vi.fn()}
      onChange={vi.fn()}
    />
  ))
  fireEvent.click(screen.getByRole('button', {name: '위치 핸들 표시'}))
  expect(screen.getByRole('button', {name: '캐릭터 얼굴 기준 조정'})).toBeDefined()
  setTarget('second')
  expect(screen.queryByRole('button', {name: '캐릭터 얼굴 기준 조정'})).toBeNull()
  expect(screen.getByRole('button', {name: '위치 핸들 표시'}).getAttribute('aria-pressed')).toBe(
    'false',
  )
})

test('should follow the camera with live draft options while saving only on pointer release', () => {
  const save = vi.fn()
  const [value, setValue] = createSignal({cameraX: 0.5, headScale: 1})
  render(() => (
    <SPoffoCalibrationPreview
      assetId={() => 'character'}
      load={vi.fn()}
      value={value()}
      onChange={save}
    />
  ))
  const tracking = vi.mocked(usePuppet).mock.calls.at(-1)![0]
  expect(tracking.tracking?.()).toBe('camera')
  expect(tracking.trackingOptions?.()).toEqual(value())
  setValue({cameraX: 0.5, headScale: 2})
  expect(tracking.trackingOptions?.()?.headScale).toBe(2)
  fireEvent.click(screen.getByRole('button', {name: '위치 핸들 표시'}))
  const handle = screen.getByRole('button', {name: '카메라 위치 조정'})
  vi.spyOn(handle.parentElement!, 'getBoundingClientRect').mockReturnValue({
    height: 100,
    width: 200,
  } as DOMRect)
  Object.defineProperty(handle, 'hasPointerCapture', {value: vi.fn(() => true)})
  Object.defineProperty(handle, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(handle, 'releasePointerCapture', {value: vi.fn()})
  const pointer = (type: string, x: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: 0})
    Object.defineProperty(event, 'pointerId', {value: 1})
    return event
  }
  fireEvent(handle, pointer('pointerdown', 100))
  fireEvent(handle, pointer('pointermove', 120))
  expect(tracking.trackingOptions?.()?.cameraX).toBeCloseTo(0.6)
  expect(save).not.toHaveBeenCalled()
  fireEvent(handle, pointer('pointerup', 120))
  expect(save).toHaveBeenCalledWith({cameraX: 0.6, cameraY: 0, headScale: 2})
  fireEvent.click(screen.getByRole('button', {name: '위치 핸들 숨기기'}))
  expect(tracking.tracking?.()).toBe('camera')
})

test('should preview the face anchor while dragging and revert it on cancellation', () => {
  const save = vi.fn()
  render(() => (
    <SPoffoCalibrationPreview
      assetId={() => 'character'}
      load={vi.fn()}
      value={{faceX: 0.5, faceY: 0.3}}
      bindings={() => ({headX: {parameterId: 'custom-head'}})}
      onChange={save}
    />
  ))
  const tracking = vi.mocked(usePuppet).mock.calls.at(-1)![0]
  expect(tracking.trackingBindings?.()?.headX?.parameterId).toBe('custom-head')
  fireEvent.click(screen.getByRole('button', {name: '위치 핸들 표시'}))
  const handle = screen.getByRole('button', {name: '캐릭터 얼굴 기준 조정'})
  vi.spyOn(handle.parentElement!, 'getBoundingClientRect').mockReturnValue({
    height: 100,
    width: 200,
  } as DOMRect)
  Object.defineProperty(handle, 'hasPointerCapture', {value: vi.fn(() => true)})
  Object.defineProperty(handle, 'releasePointerCapture', {value: vi.fn()})
  Object.defineProperty(handle, 'setPointerCapture', {value: vi.fn()})
  const pointer = (type: string, x: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: 0})
    Object.defineProperty(event, 'pointerId', {value: 1})
    return event
  }
  fireEvent(handle, pointer('pointerdown', 100))
  fireEvent(handle, pointer('pointermove', 140))
  expect(tracking.trackingOptions?.()?.faceX).toBeCloseTo(0.7)
  expect(tracking.trackingOptions?.()?.faceY).toBe(0.3)
  expect(save).not.toHaveBeenCalled()
  fireEvent.keyDown(handle, {key: 'Escape'})
  expect(tracking.trackingOptions?.()).toEqual({faceX: 0.5, faceY: 0.3})
  expect(save).not.toHaveBeenCalled()
})

test('should open face and eye calibration in cursor mode without enabling camera handles', () => {
  render(() => (
    <SPoffoCalibrationPreview
      mode="cursor"
      assetId={() => 'character'}
      load={vi.fn()}
      onChange={vi.fn()}
    />
  ))
  expect(screen.queryByRole('button', {name: '위치 핸들 표시'})).toBeNull()
  expect(screen.queryByRole('radio', {name: '위치'})).toBeNull()
  expect(screen.getByRole('spinbutton', {name: '얼굴 좌우 기본 방향'})).toBeDefined()
  expect(screen.queryByRole('button', {name: '카메라 위치 조정'})).toBeNull()
  const rendering = vi.mocked(usePuppet).mock.lastCall![0]
  expect(rendering.tracking?.()).toBe('cursor')
  fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
  expect(screen.getByRole('spinbutton', {name: '눈동자 상하 기본 방향'})).toBeDefined()
  expect(rendering.tracking?.()).toBe('cursor')
})

test('should preview two-dimensional calibration immediately and restore saved options on Escape', () => {
  const save = vi.fn()
  render(() => (
    <SPoffoCalibrationPreview
      assetId={() => 'character'}
      load={vi.fn()}
      value={{eyeCenterY: 25, headCenterX: 0}}
      onChange={save}
    />
  ))
  const rendering = vi.mocked(usePuppet).mock.lastCall![0]
  fireEvent.click(screen.getByRole('radio', {name: '얼굴'}))
  const pad = screen.getByRole('group', {name: '얼굴 기본 방향'})
  const area = pad.querySelector('[tabindex="-1"]') as HTMLDivElement
  vi.spyOn(area, 'getBoundingClientRect').mockReturnValue({
    height: 200,
    left: 0,
    top: 0,
    width: 200,
  } as DOMRect)
  Object.defineProperty(area, 'hasPointerCapture', {value: vi.fn(() => true)})
  Object.defineProperty(area, 'releasePointerCapture', {value: vi.fn()})
  Object.defineProperty(area, 'setPointerCapture', {value: vi.fn()})
  const event = new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 150, clientY: 50})
  Object.defineProperty(event, 'pointerId', {value: 1})
  fireEvent(area, event)
  expect(rendering.trackingOptions?.()).toEqual({eyeCenterY: 25, headCenterX: 50, headCenterY: 50})
  expect(save).not.toHaveBeenCalled()
  fireEvent.keyDown(area, {key: 'Escape'})
  expect(rendering.trackingOptions?.()).toEqual({eyeCenterY: 25, headCenterX: 0})
  expect(save).not.toHaveBeenCalled()
})
