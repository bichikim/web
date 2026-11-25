/** @vitest-environment jsdom */
import '@testing-library/jest-dom/vitest'
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, test, vi} from 'vitest'
import type {PoffoTrackingOptions} from '@winter-love/wallpaper/settings/tracking'
import {useFacePosition} from '../../features/tracking/use-face-position'
import {SPoffoTrackingAdjustment} from '../SPoffoTrackingAdjustment'

vi.mock('../../features/tracking/use-face-position', () => ({useFacePosition: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

test('should adjust body rotation and follow speed independently and restore only body defaults', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  const [value, setValue] = createSignal<PoffoTrackingOptions>({eyeScale: 0.5, headMaximumX: 20})
  render(() => <SPoffoTrackingAdjustment mode="cursor" value={value()} onChange={setValue} />)
  fireEvent.click(screen.getByRole('radio', {name: '몸'}))
  expect(screen.queryByRole('spinbutton', {name: '머리 정면 보정 좌우'})).toBeNull()
  const amount = screen.getByRole('spinbutton', {name: '몸 회전량'})
  const speed = screen.getByRole('spinbutton', {name: '따라오는 속도'})
  expect(amount).toHaveValue('100')
  expect(speed).toHaveValue('0.3')
  fireEvent.input(amount, {target: {value: '60'}})
  fireEvent.blur(amount)
  fireEvent.input(speed, {target: {value: '2.5'}})
  fireEvent.blur(speed)
  expect(value()).toEqual({bodyFollowSpeed: 2.5, bodyScale: 0.6, eyeScale: 0.5, headMaximumX: 20})
  fireEvent.click(screen.getByRole('button', {name: '몸 초기화'}))
  expect(value()).toEqual({bodyFollowSpeed: 0.3, bodyScale: 1, eyeScale: 0.5, headMaximumX: 20})
})

test('should save and reset head and eye follow speeds independently', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  const [value, setValue] = createSignal<PoffoTrackingOptions>({bodyFollowSpeed: 0.3, bodyScale: 1})
  render(() => <SPoffoTrackingAdjustment mode="cursor" value={value()} onChange={setValue} />)
  const head = screen.getByRole('spinbutton', {name: '따라오는 속도'})
  expect(head).toHaveValue('1')
  fireEvent.input(head, {target: {value: '0.5'}})
  fireEvent.blur(head)
  fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
  const eye = screen.getByRole('spinbutton', {name: '따라오는 속도'})
  expect(eye).toHaveValue('1')
  fireEvent.input(eye, {target: {value: '2'}})
  fireEvent.blur(eye)
  expect(value()).toEqual({
    bodyFollowSpeed: 0.3,
    bodyScale: 1,
    eyeFollowSpeed: 2,
    headFollowSpeed: 0.5,
  })
  fireEvent.click(screen.getByRole('button', {name: '눈동자 초기화'}))
  expect(value()).toMatchObject({
    bodyFollowSpeed: 0.3,
    bodyScale: 1,
    eyeFollowSpeed: 1,
    headFollowSpeed: 0.5,
  })
  fireEvent.click(screen.getByRole('radio', {name: '머리'}))
  fireEvent.click(screen.getByRole('button', {name: '머리 초기화'}))
  expect(value()).toMatchObject({
    bodyFollowSpeed: 0.3,
    bodyScale: 1,
    eyeFollowSpeed: 1,
    headFollowSpeed: 1,
  })
})

test('should configure cursor reach distance without showing camera controls or changing movement bounds', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  const [value, setValue] = createSignal<PoffoTrackingOptions>({headMaximumX: 20})
  const [mode, setMode] = createSignal<'camera' | 'cursor'>('cursor')
  render(() => <SPoffoTrackingAdjustment mode={mode()} value={value()} onChange={setValue} />)
  const reach = screen.getByRole('spinbutton', {name: '최대 도달 거리'})
  expect(reach).toHaveValue('1')
  fireEvent.input(reach, {target: {value: '0.5'}})
  fireEvent.blur(reach)
  expect(value()).toEqual({cursorReach: 0.5, headMaximumX: 20})
  fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
  const eyes = screen.getByRole('spinbutton', {name: '최대 도달 거리'})
  expect(eyes).toHaveValue('0.7')
  expect(screen.getByRole('group', {name: '눈동자 중심 보정'})).toBeDefined()
  fireEvent.input(eyes, {target: {value: '0.9'}})
  fireEvent.blur(eyes)
  expect(value()).toEqual({cursorReach: 0.5, eyeCursorReach: 0.9, headMaximumX: 20})
  fireEvent.click(screen.getByRole('radio', {name: '머리'}))
  expect(screen.getByRole('spinbutton', {name: '최대 도달 거리'})).toHaveValue('0.5')
  expect(screen.getByRole('group', {name: '머리 정면 보정'})).toBeDefined()
  setMode('camera')
  expect(screen.queryByRole('spinbutton', {name: '최대 도달 거리'})).toBeNull()
})

test('should calibrate the user position without replacing character or camera calibration', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => ({x: 0.2, y: -0.1})})
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({cameraX: -0.25, eyeScale: 0.5})
  render(() => <SPoffoTrackingAdjustment mode="camera" value={options()} onChange={setOptions} />)
  expect(screen.getByRole('radio', {name: '위치'})).toBeChecked()
  expect(screen.queryByRole('spinbutton', {name: '머리 정면 보정 좌우'})).toBeNull()
  fireEvent.click(screen.getByRole('button', {name: '현재 자세를 정면으로'}))
  expect(options()).toEqual({cameraX: -0.25, centerX: 0.2, centerY: -0.1, eyeScale: 0.5})
  fireEvent.click(screen.getByRole('button', {name: '사용자 정면 초기화'}))
  expect(options()).toEqual({cameraX: -0.25, centerX: 0, centerY: 0, eyeScale: 0.5})
})

test('should prevent calibration when a face is not detected and hide camera details in cursor mode', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  const [mode, setMode] = createSignal<'camera' | 'cursor'>('camera')
  render(() => <SPoffoTrackingAdjustment mode={mode()} onChange={vi.fn()} />)
  expect(screen.getByRole('button', {name: '현재 자세를 정면으로'})).toBeDisabled()
  setMode('cursor')
  expect(screen.queryByRole('radio', {name: '위치'})).toBeNull()
  expect(screen.queryByRole('button', {name: '현재 자세를 정면으로'})).toBeNull()
  expect(screen.getByRole('radio', {name: '머리'})).toBeChecked()
})

test('should show only the selected face or eye controls and reset their values independently', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({
    cameraX: 0.3,
    eyeCenterY: 10,
    headScale: 1.5,
  })
  render(() => <SPoffoTrackingAdjustment mode="off" value={options()} onChange={setOptions} />)
  fireEvent.click(screen.getByRole('button', {name: '머리 정면 보정 좌우 늘리기'}))
  fireEvent.click(screen.getByRole('button', {name: '머리 정면 보정 상하 줄이기'}))
  expect(options()).toMatchObject({eyeCenterY: 10, headCenterX: 1, headCenterY: -1})
  fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
  expect(screen.queryByRole('spinbutton', {name: '머리 정면 보정 좌우'})).toBeNull()
  const eyeCenter = screen.getByRole('spinbutton', {name: '눈동자 중심 보정 좌우'})
  fireEvent.input(eyeCenter, {target: {value: '100'}})
  fireEvent.blur(eyeCenter)
  expect(options().eyeCenterX).toBe(100)
  fireEvent.click(screen.getByRole('button', {name: '눈동자 초기화'}))
  expect(options()).toMatchObject({
    cameraX: 0.3,
    eyeCenterX: 0,
    eyeCenterY: 0,
    headCenterX: 1,
    headCenterY: -1,
    headScale: 1.5,
  })
})

test('should show camera geometry under position and expose bindings as a peer section', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  render(() => (
    <SPoffoTrackingAdjustment mode="camera" onChange={vi.fn()}>
      <button type="button">연결 편집</button>
    </SPoffoTrackingAdjustment>
  ))
  expect(screen.getByRole('spinbutton', {name: '카메라 가로 화각'})).toBeDefined()
  expect(screen.getByRole('spinbutton', {name: '모니터 대각선'})).toBeDefined()
  expect(screen.queryByText('고급 설정')).toBeNull()
  expect(screen.queryByRole('button', {name: '연결 편집'})).toBeNull()
  fireEvent.click(screen.getByRole('radio', {name: '연결'}))
  expect(screen.getByRole('radio', {name: '연결'})).toBeChecked()
  expect(screen.getByRole('button', {name: '연결 편집'})).toBeDefined()
  expect(screen.queryByRole('spinbutton', {name: '카메라 가로 화각'})).toBeNull()
  fireEvent.click(screen.getByRole('radio', {name: '머리'}))
  expect(screen.queryByRole('button', {name: '연결 편집'})).toBeNull()
  expect(screen.getByRole('spinbutton', {name: '머리 정면 보정 좌우'})).toBeDefined()
})

test('should keep connections available in cursor and off modes without camera controls', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  const [mode, setMode] = createSignal<'cursor' | 'off'>('cursor')
  render(() => (
    <SPoffoTrackingAdjustment mode={mode()}>
      <button type="button">연결 편집</button>
    </SPoffoTrackingAdjustment>
  ))
  fireEvent.click(screen.getByRole('radio', {name: '연결'}))
  setMode('off')
  expect(screen.getByRole('radio', {name: '연결'})).toBeChecked()
  expect(screen.getByRole('button', {name: '연결 편집'})).toBeDefined()
  expect(screen.queryByRole('radio', {name: '위치'})).toBeNull()
})

test('should adjust pose tilt without offering face-position calibration for rotation input', () => {
  const [value, setValue] = createSignal<PoffoTrackingOptions>({headMaximumX: 20})
  render(() => <SPoffoTrackingAdjustment mode="camera-pose" value={value()} onChange={setValue} />)
  expect(screen.queryByRole('radio', {name: '위치'})).toBeNull()
  fireEvent.click(screen.getByRole('radio', {name: '머리'}))
  const limit = screen.getByRole('spinbutton', {name: '머리 기울기 범위'})
  fireEvent.input(limit, {target: {value: '15'}})
  fireEvent.blur(limit)
  expect(value()).toEqual({headLimitZ: 15, headMaximumX: 20})
})
