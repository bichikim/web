/** @vitest-environment jsdom */
import {createSignal} from 'solid-js'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterAll, afterEach, beforeAll, expect, it, vi} from 'vitest'
import type {PoffoLipSync} from '@winter-love/wallpaper/settings/lipsync'
import {useParameters} from '../../features/tracking/use-parameters'
import {SPoffoLipSyncSettings} from '../SPoffoLipSyncSettings'

vi.mock('../../features/tracking/use-parameters', () => ({useParameters: vi.fn()}))
const original = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'showPopover')
beforeAll(() =>
  Object.defineProperty(HTMLElement.prototype, 'showPopover', {configurable: true, value: vi.fn()}),
)
afterAll(() => {
  if (original === undefined) {
    Reflect.deleteProperty(HTMLElement.prototype, 'showPopover')
  } else {
    Object.defineProperty(HTMLElement.prototype, 'showPopover', original)
  }
})
afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})
it('should expose lip-sync input and a independent vowel connections with per-shape inversion', () => {
  vi.mocked(useParameters).mockReturnValue({
    error: () => null,
    loading: () => false,
    parameters: () => [
      {defaultValue: 0, id: 'mouth-a', maximum: 1, minimum: 0, name: '아'},
      {defaultValue: 0, id: 'custom', maximum: 2, minimum: -2, name: '사용자 파라미터'},
    ],
  })
  const [value, setValue] = createSignal<PoffoLipSync>({source: 'off'})
  render(() => (
    <SPoffoLipSyncSettings assetId="asset" load={vi.fn()} value={value()} onChange={setValue} />
  ))
  fireEvent.click(screen.getByRole('combobox', {name: '립싱크 입력'}))
  fireEvent.click(screen.getByRole('option', {name: '음성'}))
  expect(value().source).toBe('voice')
  expect(screen.getByRole('combobox', {name: '아 입모양 파라미터'})).toHaveTextContent('자동 · 아')
  expect(screen.getByRole('combobox', {name: '에 입모양 파라미터'})).toHaveTextContent('연결 없음')
  fireEvent.click(screen.getByRole('combobox', {name: '아 입모양 파라미터'}))
  fireEvent.click(screen.getByRole('option', {name: '사용자 파라미터'}))
  fireEvent.click(screen.getByRole('button', {name: '아 입모양 방향 반전'}))
  expect(value()).toMatchObject({
    shapes: {a: {inverted: true, parameterId: 'custom'}},
    source: 'voice',
  })
  fireEvent.click(screen.getByRole('combobox', {name: '립싱크 입력'}))
  fireEvent.click(screen.getByRole('option', {name: '말풍선'}))
  expect(value()).toMatchObject({
    shapes: {a: {inverted: true, parameterId: 'custom'}},
    source: 'speech',
  })
})
