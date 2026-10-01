import {readDeviceOrientationRuntime} from 'src/features/device-orientation/read-device-orientation-runtime'
vi.mock('src/features/device-orientation/read-device-orientation-runtime', () => ({
  readDeviceOrientationRuntime: vi.fn(),
}))
/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type JSX, Show} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PRelaxPlayerPage} from '../PRelaxPlayerPage'

vi.mock('../../p-modal/PModal', () => ({
  PModal: (props: {
    readonly children: JSX.Element
    readonly isOpen: boolean
    readonly title: string
  }) => (
    <Show when={props.isOpen}>
      <div aria-label={props.title} role="dialog">
        {props.children}
      </div>
    </Show>
  ),
}))

vi.mock('../../p-music-player/PMusicPlayer', () => ({PMusicPlayer: () => <p>Music player</p>}))
vi.mock('../../music-player-view/SoundEffects', () => ({
  SoundEffects: () => <button type="button">효과음</button>,
}))
vi.mock('../RelaxGlassBackground', () => ({
  RelaxGlassBackground: (props: {
    readonly backgroundSrc: string
    readonly daylightPosition: {readonly x: number; readonly y: number}
    readonly depthOffset: {readonly x: number; readonly y: number}
    readonly depthSrc?: string
    readonly mistIntensity?: number
    readonly onPointerDown?: JSX.EventHandler<HTMLDivElement, PointerEvent>
    readonly onPointerMove?: JSX.EventHandler<HTMLDivElement, PointerEvent>
    readonly onPointerUp?: JSX.EventHandler<HTMLDivElement, PointerEvent>
    readonly weather: string
  }) => (
    <>
      <img alt="현재 배경" src={props.backgroundSrc} />
      <output aria-label="현재 깊이 맵">{props.depthSrc}</output>
      <output aria-label="깊이 가로 이동">{props.depthOffset.x}</output>
      <div
        aria-label="배경 깊이 드래그"
        onPointerDown={props.onPointerDown}
        onPointerMove={props.onPointerMove}
        onPointerUp={props.onPointerUp}
      />
      <output aria-label="현재 날씨">{props.weather}</output>
      <output aria-label="햇빛 가로 값">{props.daylightPosition.x}</output>
      <output aria-label="햇빛 세로 값">{props.daylightPosition.y}</output>
      <output aria-label="습기 강도 값">{props.mistIntensity}</output>
    </>
  ),
}))

beforeEach(() => {
  vi.mocked(readDeviceOrientationRuntime).mockReturnValue({
    available: false,
    requestPermission: null,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const sendOrientation = (beta: number, gamma: number) => {
  fireEvent(globalThis.window, Object.assign(new Event('deviceorientation'), {beta, gamma}))
}

it('should start with the sunny riverside background', () => {
  render(() => <PRelaxPlayerPage />)

  expect(screen.getByRole('img', {name: '현재 배경'})).toHaveAttribute(
    'src',
    '/relax-player/city-sunny-riverside.png',
  )
})

it('should switch between sunny and rainy glass without changing the background', () => {
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  expect(screen.getByRole('radio', {name: '맑음'})).toBeChecked()
  fireEvent.click(screen.getByRole('radio', {name: '비'}))

  expect(screen.getByRole('status', {name: '현재 날씨'})).toHaveTextContent('rainy')
  expect(screen.queryByRole('slider', {name: '햇빛 가로 위치'})).not.toBeInTheDocument()
  expect(screen.getByRole('img', {name: '현재 배경'})).toHaveAttribute(
    'src',
    '/relax-player/city-sunny-riverside.png',
  )

  fireEvent.click(screen.getByRole('radio', {name: '맑음'}))
  expect(screen.getByRole('status', {name: '현재 날씨'})).toHaveTextContent('sunny')
  expect(screen.getByRole('slider', {name: '햇빛 가로 위치'})).toBeInTheDocument()
  expect(screen.getByRole('img', {name: '현재 배경'})).toHaveAttribute(
    'src',
    '/relax-player/city-sunny-riverside.png',
  )
})

it('should adjust visible condensation in rainy weather and retain the level across weather changes', () => {
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  expect(screen.queryByRole('slider', {name: '습기 강도'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', {name: '비'}))

  const intensity = screen.getByRole('slider', {name: '습기 강도'})
  expect(intensity).toHaveValue('100')
  expect(screen.getByRole('status', {name: '습기 강도 값'})).toHaveTextContent('1')

  fireEvent.input(intensity, {target: {value: '35'}})
  expect(screen.getByRole('status', {name: '습기 강도 값'})).toHaveTextContent('0.35')

  fireEvent.click(screen.getByRole('radio', {name: '맑음'}))
  expect(screen.queryByRole('slider', {name: '습기 강도'})).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('radio', {name: '비'}))
  expect(screen.getByRole('slider', {name: '습기 강도'})).toHaveValue('35')
})

it('should offer only riverside and square backgrounds beside sound effects', () => {
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))

  expect(screen.getByRole('dialog', {name: '배경 선택'})).toBeInTheDocument()
  expect(screen.getByRole('radio', {name: '강변 공원'})).toBeChecked()
  expect(screen.queryByRole('radio', {name: '바다'})).not.toBeInTheDocument()
  expect(screen.getByRole('radio', {name: '비 갠 뒤 광장'})).not.toBeChecked()
  expect(screen.getByRole('status', {name: '현재 깊이 맵'})).toHaveTextContent(
    '/relax-player/depth/city-sunny-riverside.webp',
  )

  fireEvent.click(screen.getByRole('radio', {name: '비 갠 뒤 광장'}))

  expect(screen.getByRole('img', {name: '현재 배경'})).toHaveAttribute(
    'src',
    '/relax-player/post-rain-square-upper-floor.png',
  )
  expect(screen.getByRole('status', {name: '현재 깊이 맵'})).toHaveTextContent(
    '/relax-player/depth/post-rain-square-upper-floor.webp',
  )

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  fireEvent.click(screen.getByRole('radio', {name: '강변 공원'}))

  expect(screen.getByRole('img', {name: '현재 배경'})).toHaveAttribute(
    'src',
    '/relax-player/city-sunny-riverside.png',
  )
})

it('should let the listener choose drag or gyroscope depth movement', () => {
  vi.mocked(readDeviceOrientationRuntime).mockReturnValue({
    available: true,
    requestPermission: null,
  })
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  expect(screen.getByRole('radio', {name: '드래그'})).toBeChecked()
  fireEvent.click(screen.getByRole('radio', {name: '자이로'}))
  expect(screen.getByRole('radio', {name: '자이로'})).toBeChecked()
  fireEvent.click(screen.getByRole('radio', {name: '드래그'}))
  expect(screen.getByRole('radio', {name: '드래그'})).toBeChecked()
})

it('should move the background with drag, then return it to its resting position', () => {
  const frames = new Map<number, FrameRequestCallback>()
  let nextFrame = 0
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    nextFrame += 1
    frames.set(nextFrame, callback)
    return nextFrame
  })
  vi.stubGlobal('cancelAnimationFrame', (frame: number) => frames.delete(frame))
  const advanceFrame = (time: number) => {
    const callbacks = [...frames.values()]
    frames.clear()
    callbacks.forEach((callback) => callback(time))
  }
  render(() => <PRelaxPlayerPage />)

  const surface = screen.getByLabelText('배경 깊이 드래그')
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
    height: 800,
    width: 1000,
  } as DOMRect)
  Object.defineProperty(surface, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(surface, 'hasPointerCapture', {value: () => true})
  Object.defineProperty(surface, 'releasePointerCapture', {value: vi.fn()})
  const pointer = (type: string, clientX: number) =>
    fireEvent(
      surface,
      Object.assign(new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY: 100}), {
        pointerId: 1,
      }),
    )

  pointer('pointerdown', 100)
  pointer('pointermove', 300)
  advanceFrame(16)
  expect(Number(screen.getByRole('status', {name: '깊이 가로 이동'}).textContent)).toBeLessThan(0)

  pointer('pointerup', 300)
  for (let frame = 2; frame < 90; frame += 1) {
    advanceFrame(frame * 16)
  }
  expect(screen.getByRole('status', {name: '깊이 가로 이동'})).toHaveTextContent('0')
})

it('should keep the first pointer in control when another finger touches the background', () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  render(() => <PRelaxPlayerPage />)

  const surface = screen.getByLabelText('배경 깊이 드래그')
  vi.spyOn(surface, 'getBoundingClientRect').mockReturnValue({
    height: 800,
    width: 1000,
  } as DOMRect)
  const setPointerCapture = vi.fn()
  const releasePointerCapture = vi.fn()
  Object.defineProperty(surface, 'setPointerCapture', {value: setPointerCapture})
  Object.defineProperty(surface, 'hasPointerCapture', {value: () => true})
  Object.defineProperty(surface, 'releasePointerCapture', {value: releasePointerCapture})
  const pointer = (type: string, pointerId: number, clientX: number) =>
    fireEvent(
      surface,
      Object.assign(new MouseEvent(type, {bubbles: true, button: 0, clientX, clientY: 100}), {
        pointerId,
      }),
    )

  pointer('pointerdown', 1, 100)
  pointer('pointerdown', 2, 200)
  pointer('pointermove', 1, 300)
  frames.shift()?.(16)
  expect(Number(screen.getByRole('status', {name: '깊이 가로 이동'}).textContent)).toBeLessThan(0)
  pointer('pointerup', 1, 300)
  expect(setPointerCapture).toHaveBeenCalledTimes(1)
  expect(releasePointerCapture).toHaveBeenCalledWith(1)
})

it('should allow a new drag after changing the background during a drag', () => {
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  render(() => <PRelaxPlayerPage />)

  const firstSurface = screen.getByLabelText('배경 깊이 드래그')
  Object.defineProperty(firstSurface, 'setPointerCapture', {value: vi.fn()})
  Object.defineProperty(firstSurface, 'hasPointerCapture', {value: () => true})
  const releasePointerCapture = vi.fn()
  Object.defineProperty(firstSurface, 'releasePointerCapture', {value: releasePointerCapture})
  fireEvent(
    firstSurface,
    Object.assign(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}), {
      pointerId: 1,
    }),
  )

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  fireEvent.click(screen.getByRole('radio', {name: '비 갠 뒤 광장'}))
  const nextSurface = screen.getByLabelText('배경 깊이 드래그')
  vi.spyOn(nextSurface, 'getBoundingClientRect').mockReturnValue({
    height: 800,
    width: 1000,
  } as DOMRect)
  Object.defineProperty(nextSurface, 'setPointerCapture', {value: vi.fn()})
  fireEvent(
    nextSurface,
    Object.assign(new MouseEvent('pointerdown', {bubbles: true, button: 0, clientX: 100}), {
      pointerId: 2,
    }),
  )
  fireEvent(
    nextSurface,
    Object.assign(new MouseEvent('pointermove', {bubbles: true, button: 0, clientX: 300}), {
      pointerId: 2,
    }),
  )
  frames.shift()?.(16)

  expect(releasePointerCapture).toHaveBeenCalledWith(1)
  expect(Number(screen.getByRole('status', {name: '깊이 가로 이동'}).textContent)).toBeLessThan(0)
})

it('should calibrate gyroscope motion and ignore drag while gyroscope is selected', () => {
  vi.mocked(readDeviceOrientationRuntime).mockReturnValue({
    available: true,
    requestPermission: null,
  })
  const frames: FrameRequestCallback[] = []
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.push(callback)
    return frames.length
  })
  vi.stubGlobal('cancelAnimationFrame', vi.fn())
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  fireEvent.click(screen.getByRole('radio', {name: '자이로'}))
  sendOrientation(0, 0)
  expect(screen.getByRole('status', {name: '깊이 가로 이동'})).toHaveTextContent('0')
  sendOrientation(0, 9)
  frames.shift()?.(16)
  expect(Number(screen.getByRole('status', {name: '깊이 가로 이동'}).textContent)).toBeGreaterThan(
    0,
  )
})

it('should update the daylight position without changing the selected background', () => {
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  fireEvent.input(screen.getByRole('slider', {name: '햇빛 가로 위치'}), {
    target: {value: '40'},
  })
  fireEvent.input(screen.getByRole('slider', {name: '햇빛 세로 위치'}), {
    target: {value: '65'},
  })

  expect(screen.getByRole('status', {name: '햇빛 가로 값'})).toHaveTextContent('0.4')
  expect(screen.getByRole('status', {name: '햇빛 세로 값'})).toHaveTextContent('0.65')
  expect(screen.getByRole('img', {name: '현재 배경'})).toHaveAttribute(
    'src',
    '/relax-player/city-sunny-riverside.png',
  )
})

it('should apply a small tilt offset around the manual position and reset it when disabled', () => {
  vi.mocked(readDeviceOrientationRuntime).mockReturnValue({
    available: true,
    requestPermission: null,
  })
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  fireEvent.input(screen.getByRole('slider', {name: '햇빛 가로 위치'}), {
    target: {value: '40'},
  })
  fireEvent.click(screen.getByRole('switch', {name: '기울여서 빛 반사 조절'}))
  expect(screen.getByRole('switch', {name: '기울여서 빛 반사 조절'})).toBeChecked()

  sendOrientation(0, 0)
  sendOrientation(0, 30)

  const shiftedPosition = Number(screen.getByRole('status', {name: '햇빛 가로 값'}).textContent)
  expect(shiftedPosition).toBeGreaterThan(0.4)
  expect(shiftedPosition).toBeLessThanOrEqual(0.5)
  expect(screen.getByRole('slider', {name: '햇빛 가로 위치'})).toHaveValue('40')

  fireEvent.click(screen.getByRole('switch', {name: '기울여서 빛 반사 조절'}))
  expect(screen.getByRole('status', {name: '햇빛 가로 값'})).toHaveTextContent('0.4')
  sendOrientation(0, 30)
  expect(screen.getByRole('status', {name: '햇빛 가로 값'})).toHaveTextContent('0.4')
})

it('should keep manual positioning available when orientation permission is denied', async () => {
  const requestPermission = vi.fn().mockResolvedValue('denied')
  vi.mocked(readDeviceOrientationRuntime).mockReturnValue({available: true, requestPermission})
  render(() => <PRelaxPlayerPage />)

  fireEvent.click(screen.getByRole('button', {name: '배경 선택'}))
  fireEvent.click(screen.getByRole('switch', {name: '기울여서 빛 반사 조절'}))

  await waitFor(() => {
    expect(requestPermission).toHaveBeenCalledOnce()
    expect(screen.getByRole('switch', {name: '기울여서 빛 반사 조절'})).not.toBeChecked()
    expect(screen.getByRole('status', {name: '기울기 센서 상태'})).toHaveTextContent(
      '센서 접근이 거부됐어요',
    )
  })
  expect(screen.getByRole('slider', {name: '햇빛 가로 위치'})).toHaveValue('8')
})
