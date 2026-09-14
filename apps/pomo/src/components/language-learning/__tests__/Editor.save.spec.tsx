/** @vitest-environment jsdom */

import {
  completeTextGeneration,
  disposeRepository,
  expectStatusMessage,
  flush,
  navigate,
  setWriterState,
} from './editor.setup'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import {LanguageLearningEditor} from '../Editor'
import {LanguageLearningReview} from '../Review'
import {saveLanguageLearningCandidates} from '../save'
import {regenerateCandidateVoice} from '../voice-generation'

it('should generate, review, regenerate, toggle, and save a sentence', async () => {
  const result = render(() => <LanguageLearningEditor />)

  expect(result.container.querySelector('main')).toHaveClass(
    '[background:var(--pomo-editor-background)]',
    'text-foreground',
  )

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()

  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await waitFor(() => expect(regenerateCandidateVoice).toHaveBeenCalledOnce())
  fireEvent.click(screen.getByRole('button', {name: 'toggle'}))
  fireEvent.click(screen.getByRole('button', {name: 'save'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'toggle'}))
  fireEvent.click(screen.getByRole('button', {name: 'save'}))

  await waitFor(() => expect(saveLanguageLearningCandidates).toHaveBeenCalledOnce())
  expect(navigate).toHaveBeenCalledExactlyOnceWith('/')
  expect(disposeRepository).toHaveBeenCalledOnce()
})

it('should report save failures', async () => {
  vi.mocked(saveLanguageLearningCandidates).mockRejectedValue(new Error('save failed'))
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', {name: 'save'}))
  await flush()
  await expectStatusMessage(/저장하지 못했어요/)
})
