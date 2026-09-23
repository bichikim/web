/** @vitest-environment jsdom */
import {fireEvent, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, test} from 'vitest'
import {CameraViewport} from '../CameraViewport'

test('should move and zoom only the viewing surface and reset to the origin', () => {
  const view = render(() => (
    <CameraViewport width={400} height={300}>
      <svg data-testid="model">
        <circle cx="150" cy="125" />
      </svg>
    </CameraViewport>
  ))
  expect(view.queryByRole('spinbutton', {name: '보기 X'})).not.toBeInTheDocument()
  fireEvent.click(view.getByRole('button', {name: '보기 설정'}))
  const field = view.getByRole('spinbutton', {name: '보기 X'})
  fireEvent.input(field, {target: {value: '80'}})
  fireEvent.blur(field)
  const zoom = view.getByRole('spinbutton', {name: '보기 확대율'})
  fireEvent.input(zoom, {target: {value: '200'}})
  fireEvent.blur(zoom)
  const viewport = view.getByRole('region', {name: '모델 보기'})
  expect(viewport.style.getPropertyValue('--stage-x')).toBe('-360px')
  expect(viewport.style.getPropertyValue('--camera-zoom')).toBe('2')
  expect(view.getByTestId('model').querySelector('circle')).toHaveAttribute('cx', '150')
  fireEvent.wheel(viewport, {clientX: 100, clientY: 60, ctrlKey: true, deltaY: -100})
  expect(Number(viewport.style.getPropertyValue('--camera-zoom'))).toBeGreaterThan(2)
  fireEvent.click(view.getByRole('button', {name: '원점 · 100%'}))
  expect(field).toHaveValue(0)
  expect(zoom).toHaveValue(100)
  Object.defineProperty(viewport, 'clientWidth', {value: 200})
  Object.defineProperty(viewport, 'clientHeight', {value: 150})
  fireEvent.click(view.getByRole('button', {name: '화면 맞춤'}))
  expect(zoom).toHaveValue(50)
  Object.assign(viewport, {releasePointerCapture: () => {}, setPointerCapture: () => {}})
  fireEvent(
    viewport,
    Object.assign(
      new MouseEvent('pointerdown', {bubbles: true, button: 1, clientX: 100, clientY: 100}),
      {pointerId: 1},
    ),
  )
  fireEvent(
    viewport,
    Object.assign(new MouseEvent('pointermove', {bubbles: true, clientX: 120, clientY: 110}), {
      pointerId: 1,
    }),
  )
  fireEvent(viewport, Object.assign(new MouseEvent('pointerup', {bubbles: true}), {pointerId: 1}))
  expect(view.queryByRole('spinbutton', {name: '보기 X'})).not.toBeInTheDocument()
  fireEvent.click(view.getByRole('button', {name: '보기 설정'}))
  expect(view.getByRole('spinbutton', {name: '보기 X'})).toHaveValue(-40)
  expect(view.getByRole('spinbutton', {name: '보기 Y'})).toHaveValue(-20)
  expect(viewport).toHaveAttribute('data-panning', 'false')
})

test('should pan with two-axis scrolling and zoom with WebKit pinch gestures', () => {
  const view = render(() => (
    <CameraViewport width={400} height={300}>
      <span>model</span>
    </CameraViewport>
  ))
  const viewport = view.getByRole('region', {name: '모델 보기'})
  expect(view.queryByText('휠: 확대 · 가운데 드래그: 이동')).not.toBeInTheDocument()
  fireEvent.click(view.getByRole('button', {name: '보기 설정'}))
  fireEvent.wheel(viewport, {deltaX: 40, deltaY: 60})
  expect(view.getByRole('spinbutton', {name: '보기 X'})).toHaveValue(40)
  expect(view.getByRole('spinbutton', {name: '보기 Y'})).toHaveValue(60)
  expect(view.getByRole('spinbutton', {name: '보기 확대율'})).toHaveValue(100)
  const gesture = (type: string, scale: number) =>
    fireEvent(
      viewport,
      Object.assign(
        new MouseEvent(type, {bubbles: true, cancelable: true, clientX: 100, clientY: 50}),
        {scale},
      ),
    )
  gesture('gesturestart', 1)
  gesture('gesturechange', 2)
  expect(view.getByRole('spinbutton', {name: '보기 확대율'})).toHaveValue(200)
  expect(view.getByRole('spinbutton', {name: '보기 X'})).toHaveValue(90)
  fireEvent.wheel(viewport, {ctrlKey: true, deltaY: -100})
  expect(view.getByRole('spinbutton', {name: '보기 확대율'})).toHaveValue(200)
  gesture('gestureend', 2)
  fireEvent.wheel(viewport, {deltaX: 20, deltaY: 0})
  expect(view.getByRole('spinbutton', {name: '보기 X'})).toHaveValue(100)
})

test('should fit large imported documents below ten percent without resetting subsequent edits', () => {
  const [revision, setRevision] = createSignal(0)
  const [width, setWidth] = createSignal(4000)
  const view = render(() => (
    <CameraViewport width={width()} height={7100} fitRevision={revision()}>
      model
    </CameraViewport>
  ))
  const viewport = view.getByRole('region', {name: '모델 보기'})
  Object.defineProperty(viewport, 'clientWidth', {value: 400})
  Object.defineProperty(viewport, 'clientHeight', {value: 568})
  setRevision(1)
  expect(Number(viewport.style.getPropertyValue('--camera-zoom'))).toBeCloseTo(0.08)
  fireEvent.wheel(viewport, {deltaX: 40, deltaY: 60})
  const offset = viewport.style.getPropertyValue('--camera-x')
  setWidth(4100)
  expect(viewport.style.getPropertyValue('--camera-x')).toBe(offset)
  setRevision(2)
  expect(viewport.style.getPropertyValue('--camera-x')).toBe('0px')
  fireEvent.click(view.getByRole('button', {name: '원점 · 100%'}))
  fireEvent.click(view.getByRole('button', {name: '화면 맞춤'}))
  expect(Number(viewport.style.getPropertyValue('--camera-zoom'))).toBeCloseTo(0.08)
})
