/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {SoundJoiningPage} from '../SoundJoiningPage'
import {useSoundJoining} from 'src/features/sound-joining'
import {ModelTerms} from '../sound-generation/ModelTerms'

const generate = vi.fn()
const stop = vi.fn()
const [busy, setBusy] = createSignal(false)

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('src/features/sound-joining', () => ({useSoundJoining: vi.fn()}))
vi.mock('../sound-generation/ModelTerms', () => ({ModelTerms: vi.fn()}))

beforeEach(() => {
  vi.mocked(Title).mockImplementation(() => null)
  vi.mocked(A).mockImplementation((props) => props.children)
  vi.mocked(ModelTerms).mockImplementation(() => null)
  vi.mocked(useSoundJoining).mockReturnValue({
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
  vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn()})
})

it('should expose the joining cancellation command while work is busy', () => {
  render(() => <SoundJoiningPage />)
  setBusy(true)

  fireEvent.click(screen.getByRole('button', {name: '중지'}))

  expect(stop).toHaveBeenCalledOnce()
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should submit both selected files with the configured joining values', () => {
  render(() => <SoundJoiningPage />)
  const first = new File(['first'], 'first.wav', {type: 'audio/wav'})
  const second = new File(['second'], 'second.wav', {type: 'audio/wav'})
  fireEvent.change(screen.getByLabelText('첫 번째 오디오'), {target: {files: [first]}})
  fireEvent.change(screen.getByLabelText('두 번째 오디오'), {target: {files: [second]}})
  fireEvent.input(screen.getByRole('spinbutton', {name: 'AI로 바꿀 연결 구간 (초)'}), {
    target: {value: '6'},
  })
  fireEvent.click(screen.getByRole('button', {name: 'AI로 연결하기'}))

  expect(generate).toHaveBeenCalledWith(
    expect.objectContaining({first, second, transition: 6, trimEnd: 2, trimStart: 2}),
  )
})
