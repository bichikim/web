/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {SoundJoiningPage} from '../components/dev/SoundJoiningPage'
import {useSoundJoining} from 'src/features/sound-joining'

const generate = vi.fn()
const stop = vi.fn()
const [busy, setBusy] = createSignal(false)

vi.mock('@solidjs/meta', () => ({Title: vi.fn(() => null)}))
vi.mock('@solidjs/router', () => ({A: (props: {children: unknown}) => props.children}))
vi.mock('src/features/sound-joining', () => ({useSoundJoining: vi.fn()}))
vi.mock('../components/dev/sound-generation/ModelTerms', () => ({ModelTerms: vi.fn(() => null)}))

beforeEach(() => {
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
})

afterEach(() => {
  cleanup()
})

it('should keep generate disabled when a trim field is cleared to a non-finite value', () => {
  render(() => <SoundJoiningPage />)
  const first = new File(['first'], 'first.wav', {type: 'audio/wav'})
  const second = new File(['second'], 'second.wav', {type: 'audio/wav'})
  fireEvent.change(screen.getByLabelText('첫 번째 오디오'), {target: {files: [first]}})
  fireEvent.change(screen.getByLabelText('두 번째 오디오'), {target: {files: [second]}})
  fireEvent.input(screen.getByRole('spinbutton', {name: '첫 번째 끝에서 자르기 (초)'}), {
    target: {value: ''},
  })

  const button = screen.getByRole('button', {name: 'AI로 연결하기'})
  expect(button).toBeDisabled()
  fireEvent.click(button)
  expect(generate).not.toHaveBeenCalled()
})
