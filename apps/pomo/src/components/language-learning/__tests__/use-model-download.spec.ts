import {createDeferred} from 'src/test-utils/create-deferred'
import {createSignal} from 'solid-js'
import {expect, it, type Mock, vi} from 'vitest'

import type {ModelDownloadResult} from '../../../features/model-download'
import type {LanguageLearningPendingDownload} from '../editor-state'
import {type LanguageLearningDownloadState, useModelDownload} from '../use-model-download'

interface DownloadTestContext {
  readonly beginTextGeneration: Mock<() => void>
  readonly controller: ReturnType<typeof useModelDownload>
  readonly generateCandidateVoice: Mock<(candidateId: string) => Promise<void>>
  readonly generateVoices: Mock<() => Promise<void>>
  readonly result: ReturnType<typeof createDeferred<ModelDownloadResult>>
  readonly setPendingDownload: (target: LanguageLearningPendingDownload) => void
}

const createDownloadTestContext = (): DownloadTestContext => {
  const result = createDeferred<ModelDownloadResult>()
  const [pendingDownload, setPendingDownload] = createSignal<LanguageLearningPendingDownload>(null)
  const beginTextGeneration = vi.fn()
  const generateCandidateVoice = vi.fn().mockResolvedValue(undefined)
  const generateVoices = vi.fn().mockResolvedValue(undefined)
  const state = {
    fail: vi.fn(),
    modelDownload: {
      startTextModel: vi.fn(() => result.promise),
      startVoiceModel: vi.fn(() => result.promise),
    },
    modelId: () => 'full',
    pendingDownload,
    setDownloadContinuationActive: vi.fn(),
    setMessage: vi.fn(),
    setPendingDownload,
    setPhase: vi.fn(),
    setRegeneratingCandidateId: vi.fn(),
    workflow: {isDisposed: false},
  } satisfies LanguageLearningDownloadState

  return {
    beginTextGeneration,
    controller: useModelDownload({
      beginTextGeneration,
      generateCandidateVoice,
      generateVoices,
      state,
    }),
    generateCandidateVoice,
    generateVoices,
    result,
    setPendingDownload,
  }
}

it('should ignore confirmation without a pending download', async () => {
  const context = createDownloadTestContext()

  await context.controller.handleDownloadConfirm()

  expect(context.beginTextGeneration).not.toHaveBeenCalled()
  expect(context.generateVoices).not.toHaveBeenCalled()
  expect(context.generateCandidateVoice).not.toHaveBeenCalled()
})

it('should continue text generation once when the shared download is requested again', async () => {
  const context = createDownloadTestContext()
  const target = {kind: 'text'} as const
  context.setPendingDownload(target)
  const first = context.controller.handleDownloadConfirm()
  context.setPendingDownload(target)
  const second = context.controller.handleDownloadConfirm()

  context.result.resolve({status: 'complete'})
  await Promise.all([first, second])

  expect(context.beginTextGeneration).toHaveBeenCalledOnce()
})

it('should continue all-sentence voice generation once when the shared download is requested again', async () => {
  const context = createDownloadTestContext()
  const target = {kind: 'voice-all'} as const
  context.setPendingDownload(target)
  const first = context.controller.handleDownloadConfirm()
  context.setPendingDownload(target)
  const second = context.controller.handleDownloadConfirm()

  context.result.resolve({status: 'complete'})
  await Promise.all([first, second])

  expect(context.generateVoices).toHaveBeenCalledOnce()
})

it('should continue candidate voice generation once when the shared download is requested again', async () => {
  const context = createDownloadTestContext()
  const target = {candidateId: 'candidate-id', kind: 'voice-candidate'} as const
  context.setPendingDownload(target)
  const first = context.controller.handleDownloadConfirm()
  context.setPendingDownload(target)
  const second = context.controller.handleDownloadConfirm()

  context.result.resolve({status: 'complete'})
  await Promise.all([first, second])

  expect(context.generateCandidateVoice).toHaveBeenCalledExactlyOnceWith('candidate-id')
})
