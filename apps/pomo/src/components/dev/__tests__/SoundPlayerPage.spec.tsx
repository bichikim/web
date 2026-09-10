/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {Title} from '@solidjs/meta'
import {A} from '@solidjs/router'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {SoundPlayerPage} from '../SoundPlayerPage'
import {SoundPlayer} from '../../sound-player/SoundPlayer'

vi.mock('@solidjs/meta', () => ({Title: vi.fn()}))
vi.mock('@solidjs/router', () => ({A: vi.fn()}))
vi.mock('../../sound-player/SoundPlayer', () => ({SoundPlayer: vi.fn()}))

beforeEach(() => {
  vi.mocked(Title).mockImplementation(() => null)
  vi.mocked(A).mockImplementation((props) => props.children)
  vi.mocked(SoundPlayer).mockImplementation((props) => (
    <output data-testid="layers">{props.layers.map((layer) => layer.title).join(',')}</output>
  ))
  vi.stubGlobal('crypto', {randomUUID: vi.fn(() => 'layer-id')})
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = vi.fn(() => 'blob:rain')
      static revokeObjectURL = vi.fn()
    },
  )
})
afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

it('should add a local audio file and revoke its object URL when clearing the list', () => {
  render(() => <SoundPlayerPage />)
  const input = screen.getByLabelText(/오디오 추가/u)
  const file = new File(['audio'], 'rain.wav', {type: 'audio/wav'})
  fireEvent.change(input, {target: {files: [file]}})

  expect(screen.getByTestId('layers')).toHaveTextContent('rain.wav')
  fireEvent.click(screen.getByRole('button', {name: '목록 비우기'}))

  expect(screen.getByTestId('layers')).toHaveTextContent('')
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:rain')
})

it('should add an HTTP audio URL and report an invalid URL', () => {
  render(() => <SoundPlayerPage />)
  const input = screen.getByRole('textbox', {name: '오디오 URL'})
  fireEvent.input(input, {target: {value: 'https://example.com/rain.mp3'}})
  fireEvent.submit(input.closest('form')!)

  expect(screen.getByTestId('layers')).toHaveTextContent('효과음 1')
  fireEvent.input(input, {target: {value: 'ftp://example.com/rain.mp3'}})
  fireEvent.submit(input.closest('form')!)
  expect(screen.getByRole('alert')).toHaveTextContent('유효한 오디오 URL')
})
