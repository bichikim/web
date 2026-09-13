/** @vitest-environment jsdom */

import {
  candidate,
  createDeferred,
  flush,
  renderGeneratedReview,
  setWriterState,
  startTextModel,
} from './editor.setup'
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {ModelDownloadController} from '../../../features/model-download/controller'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
import {isTextModelDownloaded} from '../../../features/text-generation'
import {LanguageLearningEditor} from '../Editor'
import {saveLanguageLearningCandidates} from '../save'
import {generateVoiceCandidates, regenerateCandidateVoice} from '../voice-generation'

it('should stop every pending workflow after the editor is disposed', async () => {
  const textCheck = createDeferred<boolean>()
  vi.mocked(isTextModelDownloaded).mockReturnValueOnce(textCheck.promise)
  let view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await waitFor(() => expect(isTextModelDownloaded).toHaveBeenCalled())
  view.unmount()
  textCheck.resolve(true)
  await flush()

  const textDownload =
    createDeferred<Awaited<ReturnType<ModelDownloadController['startTextModel']>>>()
  setWriterState({status: 'idle'})
  vi.mocked(isTextModelDownloaded).mockResolvedValueOnce(false)
  startTextModel.mockReturnValueOnce(textDownload.promise)
  view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await waitFor(() => expect(startTextModel).toHaveBeenCalled())
  view.unmount()
  textDownload.resolve({status: 'complete'})
  await flush()

  const voiceCheck = createDeferred<boolean>()
  setWriterState({status: 'idle'})
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(voiceCheck.promise)
  view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await waitFor(() => expect(isSupertonicModelDownloaded).toHaveBeenCalled())
  view.unmount()
  voiceCheck.resolve(true)
  await flush()

  const voiceGeneration = createDeferred<Awaited<ReturnType<typeof generateVoiceCandidates>>>()
  vi.mocked(generateVoiceCandidates).mockReturnValueOnce(voiceGeneration.promise)
  setWriterState({status: 'idle'})
  view = render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await waitFor(() => expect(generateVoiceCandidates).toHaveBeenCalled())
  view.unmount()
  voiceGeneration.resolve({candidates: [candidate()], status: 'complete'})
  await flush()

  view = await renderGeneratedReview()
  const regenerateCheck = createDeferred<boolean>()
  vi.mocked(isSupertonicModelDownloaded).mockReturnValueOnce(regenerateCheck.promise)
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  view.unmount()
  regenerateCheck.resolve(true)
  await flush()

  view = await renderGeneratedReview()
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

  view = await renderGeneratedReview()
  const save = createDeferred<void>()
  vi.mocked(saveLanguageLearningCandidates).mockReturnValueOnce(save.promise)
  fireEvent.click(screen.getByRole('button', {name: 'save'}))
  await waitFor(() => expect(saveLanguageLearningCandidates).toHaveBeenCalled())
  view.unmount()
  save.resolve(undefined)
  await flush()
})
