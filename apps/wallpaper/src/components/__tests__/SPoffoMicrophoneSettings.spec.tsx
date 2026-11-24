/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {SPoffoMicrophoneSettings} from '../SPoffoMicrophoneSettings'
import {useMicrophoneSettings} from '../../features/lipsync/use-microphone-settings'

vi.mock('../../features/lipsync/use-microphone-settings', () => ({useMicrophoneSettings: vi.fn()}))
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it('should display the shared input level and save the quiet sound threshold', () => {
  vi.mocked(useMicrophoneSettings).mockReturnValue({
    devices: () => [],
    error: () => null,
    retry: vi.fn(),
    state: () => ({level: 0.42, phase: 'listening', widgetId: 'widget'}),
  })
  const [value, setValue] = createSignal<PoffoLipSync['microphone']>({
    deviceId: '',
    threshold: 0.15,
  })
  render(() => <SPoffoMicrophoneSettings widgetId="widget" value={value()} onChange={setValue} />)
  expect(screen.getByRole('meter', {name: '마이크 입력 레벨'})).toHaveAttribute(
    'aria-valuenow',
    '42',
  )
  expect(screen.getByRole('combobox', {name: '립싱크 마이크'})).toHaveTextContent('시스템 기본')
  const threshold = screen.getByRole('spinbutton', {name: '작은 소리 무시'})
  fireEvent.input(threshold, {target: {value: '30'}})
  fireEvent.blur(threshold)
  expect(value()).toEqual({deviceId: '', threshold: 0.3})
})
