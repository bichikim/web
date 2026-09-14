/** @vitest-environment jsdom */

import {
  createDeferred,
  flush,
  generateWithPreparation,
  getLatestProps,
  setModelDownloadState,
  setWriterOutput,
  setWriterState,
  startTextModel,
} from './editor.setup'
import {cleanup, fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {type ComponentProps} from 'solid-js'
import {expect, it, vi} from 'vitest'
import {
  isValidLanguageLearningSentence,
  selectLanguageLearningPromptWords,
} from '../../../features/language-learning'
import {isTextModelDownloaded} from '../../../features/text-generation'
import {PGenerationStatus} from '../../p-generation-status/PGenerationStatus'
import {PModelDownloadConsent} from '../../p-model-download-consent/PModelDownloadConsent'
import {LanguageLearningEditor} from '../Editor'
import {LanguageLearningGenerateButton} from '../GenerateButton'
import {LanguageLearningReview} from '../Review'
import {LanguageLearningSettings} from '../Settings'
import {generateVoiceCandidates} from '../voice-generation'
import {LanguageLearningWordSourceControl} from '../WordSource'

it('should retry invalid text twice and then report the validation failure', async () => {
  vi.mocked(isValidLanguageLearningSentence).mockReturnValue(false)
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  for (let retry = 0; retry < 3; retry += 1) {
    setWriterState({status: 'generating'})
    setWriterState({status: 'complete'})
    // oxlint-disable-next-line eslint/no-await-in-loop -- Each retry is queued only after the previous completion is observed.
    await flush()
  }

  expect(
    screen.getByText('조건에 맞는 한 문장을 만들지 못했어요. 다시 시도해 주세요.'),
  ).toBeDefined()
})

it('should report writer errors and reject empty direct or saved prompts', async () => {
  vi.mocked(selectLanguageLearningPromptWords).mockReturnValue([])
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  expect(screen.getByText('프롬프트 단어를 하나 이상 입력해 주세요.')).toBeDefined()

  const wordSourceProps = getLatestProps<ComponentProps<typeof LanguageLearningWordSourceControl>>(
    vi.mocked(LanguageLearningWordSourceControl),
  )
  wordSourceProps.onSourceChange('saved')
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  expect(screen.getByText(/외우지 않은 학습 단어가 부족해요/)).toBeDefined()

  vi.mocked(selectLanguageLearningPromptWords).mockReturnValue(['word'])
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterState({message: 'writer failed', modelReady: false, status: 'error'})
  expect(screen.getByText('writer failed')).toBeDefined()
})

it('should download a missing text model and handle failed or cancelled downloads', async () => {
  vi.mocked(isTextModelDownloaded).mockResolvedValue(false)
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  expect(
    getLatestProps<ComponentProps<typeof PModelDownloadConsent>>(vi.mocked(PModelDownloadConsent))
      .isOpen,
  ).toBe(true)
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()
  expect(startTextModel).toHaveBeenCalledOnce()

  setModelDownloadState({
    label: 'Gemma 4 E2B',
    percentage: 37,
    status: 'loading',
    target: {kind: 'text', modelId: 'gemma-4-e2b'},
  })
  expect(screen.getByRole('button', {name: 'generate'})).toBeDisabled()
  expect(
    getLatestProps<ComponentProps<typeof PGenerationStatus>>(vi.mocked(PGenerationStatus)),
  ).toMatchObject({
    kind: 'draft',
    message: 'Gemma 4 E2B 모델 받는 중 · 37%',
    progress: 37,
    progressLabel: '모델 다운로드 진행률',
  })
  setModelDownloadState({status: 'idle'})

  cleanup()
  setWriterState({status: 'idle'})
  startTextModel.mockResolvedValue({message: 'download failed', status: 'error'})
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()
  expect(screen.getByText('download failed')).toBeDefined()

  cleanup()
  setWriterState({status: 'idle'})
  startTextModel.mockResolvedValue({status: 'cancelled'})
  render(() => <LanguageLearningEditor />)
  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  fireEvent.click(screen.getByRole('button', {name: 'confirm download'}))
  await flush()
  expect(startTextModel).toHaveBeenCalled()
})

it('should start one text workflow while the installed-model check is pending', async () => {
  const modelCheck = createDeferred<boolean>()
  vi.mocked(isTextModelDownloaded).mockReturnValue(modelCheck.promise)
  render(() => <LanguageLearningEditor />)
  const generateButton = screen.getByRole('button', {name: 'generate'})

  fireEvent.click(generateButton)
  expect(generateButton).toBeDisabled()
  expect(
    getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
      vi.mocked(LanguageLearningSettings),
    ).disabled,
  ).toBe(true)
  getLatestProps<ComponentProps<typeof LanguageLearningGenerateButton>>(
    vi.mocked(LanguageLearningGenerateButton),
  ).onPress()
  modelCheck.resolve(true)
  await flush()

  expect(isTextModelDownloaded).toHaveBeenCalledOnce()
  expect(generateWithPreparation).toHaveBeenCalledOnce()
})

it('should report a text model check failure and unlock the editor', async () => {
  vi.mocked(isTextModelDownloaded).mockRejectedValue(new Error('model storage failed'))
  render(() => <LanguageLearningEditor />)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()

  expect(screen.getByText('학습 문장을 만들지 못했어요.')).toBeDefined()
  expect(screen.getByRole('button', {name: 'generate'})).not.toBeDisabled()
  expect(generateWithPreparation).not.toHaveBeenCalled()
})

it('should generate every requested sentence before starting voice generation', async () => {
  render(() => <LanguageLearningEditor />)
  const settingsProps = getLatestProps<ComponentProps<typeof LanguageLearningSettings>>(
    vi.mocked(LanguageLearningSettings),
  )
  settingsProps.onCountChange(2)

  fireEvent.click(screen.getByRole('button', {name: 'generate'}))
  await flush()
  setWriterOutput('First sentence.')
  setWriterState({status: 'complete'})
  await flush()
  expect(LanguageLearningReview).not.toHaveBeenCalled()
  setWriterOutput('Second sentence.')
  setWriterState({status: 'generating'})
  setWriterState({status: 'complete'})

  await waitFor(() => expect(LanguageLearningReview).toHaveBeenCalled())
  expect(generateVoiceCandidates).toHaveBeenCalledWith(
    expect.objectContaining({sentences: ['First sentence.', 'Second sentence.']}),
  )
  fireEvent.click(screen.getByRole('button', {name: 'toggle'}))
  const reviewProps = getLatestProps<ComponentProps<typeof LanguageLearningReview>>(
    vi.mocked(LanguageLearningReview),
  )
  reviewProps.onToggle('missing')
  await reviewProps.onRegenerate(reviewProps.candidates[0]?.id ?? 'missing')
})
