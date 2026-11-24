/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SGeneralSettings} from '../SGeneralSettings'
import {createDictationPreferences} from '../../features/dictation/preferences'

vi.mock('../../features/dictation/preferences', async () => {
  const actual = await vi.importActual<typeof import('../../features/dictation/preferences')>(
    '../../features/dictation/preferences',
  )
  return {...actual, createDictationPreferences: vi.fn()}
})
afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

it('should edit and save shared voice input preferences from general settings', async () => {
  const save = vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: false})
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save,
  })
  render(() => <SGeneralSettings />)
  const model = screen.getByRole('combobox', {name: '음성 인식 모델'})
  await waitFor(() => expect(model).toHaveAttribute('aria-disabled', 'false'))
  expect(model).toHaveTextContent('BuzzASR/korean')
  fireEvent.click(screen.getByRole('switch', {name: 'Silero VAD'}))
  await waitFor(() => expect(save).toHaveBeenCalledExactlyOnceWith({vad: false}))
  await waitFor(() =>
    expect(screen.getByRole('switch', {name: 'Silero VAD'})).toHaveAttribute(
      'aria-checked',
      'false',
    ),
  )
})

it('should retain saved preferences and report failed writes', async () => {
  vi.mocked(createDictationPreferences).mockReturnValue({
    close: vi.fn(),
    read: vi.fn().mockResolvedValue({model: 'buzzasr-korean-q8', vad: true}),
    save: vi.fn().mockRejectedValue(new Error('storage unavailable')),
  })
  render(() => <SGeneralSettings />)
  const vad = screen.getByRole('switch', {name: 'Silero VAD'})
  await waitFor(() => expect(vad).toBeEnabled())
  fireEvent.click(vad)
  expect(await screen.findByRole('alert')).toHaveTextContent('설정')
  expect(vad).toHaveAttribute('aria-checked', 'true')
})
