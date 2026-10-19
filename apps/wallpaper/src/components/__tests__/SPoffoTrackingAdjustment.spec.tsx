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

test('should calibrate the user position without replacing character or camera calibration', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => ({x: 0.2, y: -0.1})})
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({cameraX: -0.25, eyeScale: 0.5})
  render(() => <SPoffoTrackingAdjustment mode="camera" value={options()} onChange={setOptions} />)
  expect(screen.getByRole('radio', {name: '위치'})).toBeChecked()
  expect(screen.queryByRole('spinbutton', {name: '얼굴 좌우 기본 방향'})).toBeNull()
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
  expect(screen.getByRole('radio', {name: '얼굴'})).toBeChecked()
})

test('should show only the selected face or eye controls and reset their values independently', () => {
  vi.mocked(useFacePosition).mockReturnValue({error: () => null, point: () => null})
  const [options, setOptions] = createSignal<PoffoTrackingOptions>({
    cameraX: 0.3,
    eyeCenterY: 10,
    headScale: 1.5,
  })
  render(() => <SPoffoTrackingAdjustment mode="off" value={options()} onChange={setOptions} />)
  fireEvent.click(screen.getByRole('button', {name: '얼굴 좌우 기본 방향 늘리기'}))
  fireEvent.click(screen.getByRole('button', {name: '얼굴 상하 기본 방향 줄이기'}))
  expect(options()).toMatchObject({eyeCenterY: 10, headCenterX: 1, headCenterY: -1})
  fireEvent.click(screen.getByRole('radio', {name: '눈동자'}))
  expect(screen.queryByRole('spinbutton', {name: '얼굴 좌우 기본 방향'})).toBeNull()
  const eyeCenter = screen.getByRole('spinbutton', {name: '눈동자 좌우 기본 방향'})
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
  fireEvent.click(screen.getByRole('radio', {name: '얼굴'}))
  expect(screen.queryByRole('button', {name: '연결 편집'})).toBeNull()
  expect(screen.getByRole('spinbutton', {name: '얼굴 좌우 기본 방향'})).toBeDefined()
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
