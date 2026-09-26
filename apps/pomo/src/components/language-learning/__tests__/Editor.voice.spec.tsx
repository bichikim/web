/** @vitest-environment jsdom */

import {
  candidate,
  completeTextGeneration,
  expectStatusMessage,
  flush,
  getLatestProps,
  LanguageLearningEditorWithPreferences,
  setWriterState,
  startVoiceModel,
} from './editor.setup'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type ComponentProps} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {isSupertonicModelDownloaded} from '../../../features/supertonic'
import {PModelDownloadConsent} from '../../p-model-download-consent/PModelDownloadConsent'
import {LanguageLearningReview} from '../Review'
import {generateVoiceCandidates, regenerateCandidateVoice} from '../voice-generation'

it('should cancel or complete a missing all-sentence voice model download', async () => {
  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  render(() => <LanguageLearningEditorWithPreferences />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'cancel download'}))
  expect(screen.getByText('단어와 설정을 정한 뒤 만들기를 눌러 주세요.')).toBeDefined()

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await flush()
  startVoiceModel.mockResolvedValueOnce({status: 'cancelled'})
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await expectStatusMessage(/단어와 설정을 정한 뒤/)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
  expect(startVoiceModel).toHaveBeenCalledTimes(2)
})

it('should report voice workflow and model-check failures', async () => {
  vi.mocked(generateVoiceCandidates).mockResolvedValue({
    message: 'voice workflow failed',
    status: 'error',
  })
  render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'complete'})
  await flush()
  await expectStatusMessage(/voice workflow failed/)

  cleanup()
  setWriterState({status: 'idle'})
  vi.mocked(generateVoiceCandidates).mockResolvedValue({status: 'cancelled'})
  vi.mocked(isSupertonicModelDownloaded).mockRejectedValue(new Error('model check failed'))
  render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})
  await flush()
  await expectStatusMessage(/음성을 만들지 못했어요/)
})

it('should handle missing and failed candidate voice regeneration', async () => {
  render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()
  const reviewProps = getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  )

  await reviewProps.onRegenerate('missing')
  vi.mocked(isSupertonicModelDownloaded).mockRejectedValueOnce(new Error('check failed'))
  await reviewProps.onRegenerate(reviewProps.candidates[0]?.id ?? 'missing')
  await expectStatusMessage(/음성을 만들지 못했어요/)
})

it('should handle candidate voice downloads and workflow results', async () => {
  render(() => <LanguageLearningEditorWithPreferences />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  await completeTextGeneration()
  const candidateId = getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).candidates[0]?.id
  if (candidateId === undefined) {
    throw new Error('학습 문장 후보가 준비되지 않았습니다.')
  }

  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(false)
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  expect(
    getLatestProps<ComponentProps<typeof PModelDownloadConsent>>(vi.mocked(PModelDownloadConsent))
      .actionLabel,
  ).toBe('목소리 다시 만들기')
  fireEvent.click(screen.getByRole('button', {name: 'cancel download'}))

  startVoiceModel.mockResolvedValueOnce({message: 'candidate download failed', status: 'error'})
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  fireEvent.click(screen.getByRole('button', {name: 'cancel download'}))
  await expectStatusMessage(/candidate download failed/)

  startVoiceModel.mockResolvedValueOnce({status: 'cancelled'})
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()

  startVoiceModel.mockResolvedValueOnce({status: 'complete'})
  fireEvent.click(screen.getByRole('button', {name: 'regenerate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await waitFor(() => expect(regenerateCandidateVoice).toHaveBeenCalled())
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))

  vi.mocked(isSupertonicModelDownloaded).mockResolvedValue(true)
  vi.mocked(regenerateCandidateVoice).mockResolvedValueOnce({
    message: 'candidate voice failed',
    status: 'error',
  })
  await getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).onRegenerate(candidateId)
  await expectStatusMessage(/candidate voice failed/)

  vi.mocked(regenerateCandidateVoice).mockResolvedValueOnce({status: 'cancelled'})
  await getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).onRegenerate(candidateId)

  vi.mocked(regenerateCandidateVoice).mockResolvedValueOnce({
    candidate: {...candidate(), audioUrl: 'blob:replacement'},
    status: 'complete',
  })
  await getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  ).onRegenerate(candidateId)
  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningReview>>(vi.mocked(LanguageLearningReview))
      .candidates,
  ).toContainEqual(expect.objectContaining({audioUrl: 'blob:replacement'}))
})
