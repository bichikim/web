/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {SoundLoopPage} from '../SoundLoopPage'
import {useSoundGeneration} from 'src/features/sound-generation'
import {ModelTerms} from '../sound-generation/ModelTerms'

const generate = vi.fn()
const stop = vi.fn()
const [busy, setBusy] = createSignal(false)

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('src/features/sound-generation', () => ({
  DEFAULT_CONNECTION_SECONDS: 4,
  MAX_AI_CONNECTION_SECONDS: 10,
  useSoundGeneration: vi.fn(),
}))
vi.mock('../sound-generation/ModelTerms', () => ({ModelTerms: vi.fn()}))

beforeEach(() => {
  vi.mocked(Title).mockImplementation(() => null)
  vi.mocked(A).mockImplementation((props) => props.children)
  vi.mocked(ModelTerms).mockImplementation(() => null)
  vi.mocked(useSoundGeneration).mockReturnValue({
    busy,
    error: () => null,
    generate,
    status: () => 'ready',
    stop,
    url: () => null,
  })
  generate.mockReset()
  stop.mockReset()
  setBusy(false)
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:source'), revokeObjectURL: vi.fn()})
})

it('should expose the loop generation cancellation command while work is busy', () => {
  render(() => <SoundLoopPage />)
  setBusy(true)

  fireEvent.click(screen.getByRole('button', {name: '중지'}))

  expect(stop).toHaveBeenCalledOnce()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should generate a loop from the selected source and connection duration', () => {
  render(() => <SoundLoopPage />)
  const source = new File(['audio'], 'rain.wav', {type: 'audio/wav'})
  fireEvent.change(screen.getByLabelText('원본 WAV'), {target: {files: [source]}})
  fireEvent.input(screen.getByRole('spinbutton', {name: '연결 구간 (초)'}), {
    target: {value: '6'},
  })
  fireEvent.click(screen.getByRole('button', {name: 'AI로 루프 만들기'}))

  expect(generate).toHaveBeenCalledWith(
    expect.objectContaining({connectionSeconds: 6, source, type: 'loop'}),
  )
})

it('should allow a ten-second connection duration', () => {
  render(() => <SoundLoopPage />)
  const source = new File(['audio'], 'rain.wav', {type: 'audio/wav'})
  fireEvent.change(screen.getByLabelText('원본 WAV'), {target: {files: [source]}})
  fireEvent.input(screen.getByRole('spinbutton', {name: '연결 구간 (초)'}), {
    target: {value: '10'},
  })
  fireEvent.click(screen.getByRole('button', {name: 'AI로 루프 만들기'}))

  expect(generate).toHaveBeenCalledWith(
    expect.objectContaining({connectionSeconds: 10, source, type: 'loop'}),
  )
})

it('should disable generation outside the allowed connection range', () => {
  render(() => <SoundLoopPage />)
  fireEvent.change(screen.getByLabelText('원본 WAV'), {
    target: {files: [new File(['audio'], 'rain.wav', {type: 'audio/wav'})]},
  })
  fireEvent.input(screen.getByRole('spinbutton', {name: '연결 구간 (초)'}), {
    target: {value: '11'},
  })

  expect(screen.getByRole('button', {name: 'AI로 루프 만들기'})).toBeDisabled()
})
