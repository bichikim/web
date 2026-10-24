/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import type {PoffoTrackingOptions} from '@winter-love/wallpaper/settings/tracking'
import {SPoffoCameraPosition} from '../SPoffoCameraPosition'

afterEach(cleanup)
test('should overlay the camera on the existing preview instead of adding a separate monitor', () => {
  render(() => (
    <SPoffoCameraPosition onChange={vi.fn()}>
      <canvas aria-label="기존 캐릭터 미리보기" />
    </SPoffoCameraPosition>
  ))
  const preview = screen.getByRole('region', {name: '카메라 위치 미리보기'})
  expect(preview.querySelectorAll('canvas')).toHaveLength(1)
  expect(screen.queryByText('모니터')).toBeNull()
  expect(preview.contains(screen.getByRole('button', {name: '카메라 위치 조정'}))).toBe(true)
})
test('should preserve off-screen placement and other options when adjusting with the keyboard', () => {
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({
    cameraX: -1,
    cameraY: 0,
    headScale: 1.5,
  })
  render(() => <SPoffoCameraPosition value={options()} onChange={setOptions} />)
  fireEvent.keyDown(screen.getByRole('button', {name: '카메라 위치 조정'}), {key: 'ArrowRight'})
  expect(options()).toEqual({cameraX: -0.99, cameraY: 0, headScale: 1.5})
  const view = screen.getByRole('button', {name: '화면 밖 보기'})
  fireEvent.click(view)
  expect(view.getAttribute('aria-pressed')).toBe('true')
  expect(options().cameraX).toBe(-0.99)
})

test('should commit a pointer drag in monitor coordinates on release', () => {
  const save = vi.fn()
  render(() => <SPoffoCameraPosition onChange={save} />)
  const handle = screen.getByRole('button', {name: '카메라 위치 조정'})
  vi.spyOn(handle.parentElement!, 'getBoundingClientRect').mockReturnValue({
    height: 100,
    width: 200,
  } as DOMRect)
  Object.defineProperty(handle, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(handle, 'releasePointerCapture', {value: vi.fn()})
  const pointer = (type: string, x: number, y: number) => {
    const event = new MouseEvent(type, {bubbles: true, button: 0, clientX: x, clientY: y})
    Object.defineProperty(event, 'pointerId', {value: 1})
    return event
  }
  fireEvent(handle, pointer('pointerdown', 100, 20))
  expect(document.activeElement).toBe(handle)
  fireEvent(handle, pointer('pointermove', 120, 40))
  expect(save).not.toHaveBeenCalled()
  fireEvent(handle, pointer('pointerup', 120, 40))
  expect(save.mock.lastCall?.[0].cameraX).toBeCloseTo(0.6)
  expect(save.mock.lastCall?.[0].cameraY).toBeCloseTo(0.2)
})
