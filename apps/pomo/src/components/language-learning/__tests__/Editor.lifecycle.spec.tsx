/** @vitest-environment jsdom */

import {
  candidate,
  createDeferred,
  flush,
  LanguageLearningEditorWithPreferences,
  renderGeneratedReview,
  setWriterState,
  startTextModel,
} from './editor.setup'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {ModelDownloadController} from '../../../features/model-download/controller'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
import {isTextModelDownloaded} from '../../../features/text-generation'
import {saveLanguageLearningCandidates} from '../save'
import {generateVoiceCandidates, regenerateCandidateVoice} from '../voice-generation'

it('should stop the pending text-model availability check after disposal', async () => {
  const textCheck = createDeferred<boolean>()
  vi.mocked(isTextModelDownloaded).mockReturnValueOnce(textCheck.promise)
  const view = render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await waitFor(() => expect(isTextModelDownloaded).toHaveBeenCalled())
  view.unmount()
  textCheck.resolve(true)
  await flush()
})

it('should stop the pending text-model download after disposal', async () => {
  const textDownload =
    createDeferred<Awaited<ReturnType<ModelDownloadController['startTextModel']>>>()
  vi.mocked(isTextModelDownloaded).mockResolvedValueOnce(false)
  startTextModel.mockReturnValueOnce(textDownload.promise)
  const view = render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await waitFor(() => expect(startTextModel).toHaveBeenCalled())
  view.unmount()
  textDownload.resolve({status: 'complete'})
  await flush()
})

it('should stop the pending voice-model availability check after disposal', async () => {
  const voiceCheck = createDeferred<boolean>()
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(voiceCheck.promise)
  const view = render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await waitFor(() => expect(isSupertonicModelDownloaded).toHaveBeenCalled())
  view.unmount()
  voiceCheck.resolve(true)
  await flush()
})

it('should stop pending voice generation after disposal', async () => {
  const voiceGeneration = createDeferred<Awaited<ReturnType<typeof generateVoiceCandidates>>>()
  vi.mocked(generateVoiceCandidates).mockReturnValueOnce(voiceGeneration.promise)
  const view = render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await waitFor(() => expect(generateVoiceCandidates).toHaveBeenCalled())
  view.unmount()
  voiceGeneration.resolve({candidates: [candidate()], status: 'complete'})
  await flush()
})

it('should stop the pending regeneration model check after disposal', async () => {
  const view = await renderGeneratedReview()
  const regenerateCheck = createDeferred<boolean>()
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(regenerateCheck.promise)
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  view.unmount()
  regenerateCheck.resolve(true)
  await flush()
})

it('should stop pending voice regeneration after disposal', async () => {
  const view = await renderGeneratedReview()
  const regeneration = createDeferred<Awaited<ReturnType<typeof regenerateCandidateVoice>>>()
  vi.mocked(regenerateCandidateVoice).mockReturnValueOnce(regeneration.promise)
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await waitFor(() => expect(regenerateCandidateVoice).toHaveBeenCalled())
  view.unmount()
  regeneration.resolve({
    candidate: {...candidate(), audioUrl: 'blob:disposed-regeneration'},
    status: 'complete',
  })
  await flush()
})

it('should stop saving candidates after disposal', async () => {
  const view = await renderGeneratedReview()
  const save = createDeferred<void>()
  vi.mocked(saveLanguageLearningCandidates).mockReturnValueOnce(save.promise)
  fireEvent.click(screen.getByRole('button', {name: 'save'}))
  await waitFor(() => expect(saveLanguageLearningCandidates).toHaveBeenCalled())
  view.unmount()
  save.resolve(undefined)
  await flush()
})
