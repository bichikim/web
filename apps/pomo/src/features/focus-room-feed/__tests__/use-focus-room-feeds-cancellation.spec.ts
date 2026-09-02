import {
  createConnection,
  createEventContext,
  createItem,
  createJob,
  createVoiceClient,
  getFeedTestMocks,
} from './use-focus-room-feeds.fixture'
import {renderHook} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'

import type {SupertonicClient} from '../../supertonic'
import {feedGenerationRuntime} from '../generation-runtime'
import {usePFeeds} from '../use-focus-room-feeds'

const {preparationMocks, repositoryMocks, syncMocks} = getFeedTestMocks()

it('should cancel active generation, clear queued jobs, and preserve them for recovery', async () => {
  const firstJob = createJob({id: 'job-1', itemTitle: '첫 번째 피드'})
  const secondJob = createJob({feedItemId: 'item-2', id: 'job-2', itemTitle: '둘째 피드'})
  const interruptedJobs = [
    {...firstJob, status: 'interrupted' as const},
    {...secondJob, status: 'interrupted' as const},
  ]
  const voiceClient = createVoiceClient()
  let finishGeneration: () => void = () => undefined
  const generationSignals: Array<AbortSignal | undefined> = []
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockImplementation(
    (options) =>
      new Promise((resolve) => {
        generationSignals.push(options.signal)
        finishGeneration = () => resolve({message: '취소됨', ok: false})
      }),
  )
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([firstJob, secondJob])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([createItem()])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue(interruptedJobs)
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [firstJob.id, secondJob.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    await options.prepareModel(options.job.modelId)
    return {job: options.job, status: 'ready'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(feedGenerationRuntime.generateDialogueAudio).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()

  expect(voiceClient.cancelGeneration).toHaveBeenCalledOnce()
  expect(voiceClient.dispose).toHaveBeenCalledOnce()
  expect(generationSignals[0]?.aborted).toBe(true)
  expect(repositoryMocks.feedRepository.interruptUnfinishedJobs).toHaveBeenCalledTimes(2)
  expect(view.result.recoveryJobs()).toEqual(interruptedJobs)
  finishGeneration()
  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  expect(feedGenerationRuntime.generateDialogueAudio).toHaveBeenCalledOnce()
  expect(repositoryMocks.feedRepository.complete).not.toHaveBeenCalled()
  view.cleanup()
})

it('should stop a queued job before model preparation starts', async () => {
  const job = createJob()
  const connection = createConnection()
  let cancelProcessing: () => Promise<void> = async () => undefined
  let cancellation: Promise<void> | null = null
  repositoryMocks.listConnections.mockReturnValueOnce([connection]).mockImplementation(() => {
    cancellation = cancelProcessing()
    return [connection]
  })
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  const generate = vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  cancelProcessing = view.result.cancelProcessing

  await vi.waitFor(() => expect(cancellation).not.toBeNull())
  await cancellation

  expect(preparationMocks.prepareFeedGeneration).not.toHaveBeenCalled()
  expect(generate).not.toHaveBeenCalled()
  view.cleanup()
})

it('should ignore model preparation that finishes after cancellation', async () => {
  const job = createJob()
  const voiceClient = createVoiceClient()
  let finishPreparation: () => void = () => undefined
  preparationMocks.prepareFeedGeneration.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishPreparation = () => resolve({job, status: 'ready'})
      }),
  )
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  const generate = vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(preparationMocks.prepareFeedGeneration).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()
  finishPreparation()

  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  expect(generate).not.toHaveBeenCalled()
  view.cleanup()
})

it('should dispose a voice client that arrives after cancellation without restoring state', async () => {
  const job = createJob()
  const voiceClient = createVoiceClient()
  const clientCreation = Promise.withResolvers<SupertonicClient>()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockReturnValue(clientCreation.promise)
  const generate = vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(feedGenerationRuntime.createVoiceClient).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()
  expect(view.result.state().status).toBe('idle')

  clientCreation.resolve(voiceClient)

  await vi.waitFor(() => expect(voiceClient.dispose).toHaveBeenCalledOnce())
  expect(voiceClient.initialize).not.toHaveBeenCalled()
  expect(view.result.state().status).toBe('idle')
  expect(generate).not.toHaveBeenCalled()
  view.cleanup()
})

it('should ignore late initialization updates after cancellation', async () => {
  const job = createJob()
  const voiceClient = createVoiceClient()
  const initialization =
    Promise.withResolvers<Awaited<ReturnType<SupertonicClient['initialize']>>>()
  let reportProgress: Parameters<SupertonicClient['initialize']>[0]['onProgress'] = () => undefined
  let reportStatus: Parameters<SupertonicClient['initialize']>[0]['onStatus'] = () => undefined
  vi.mocked(voiceClient.initialize).mockImplementation((options) => {
    reportProgress = options.onProgress
    reportStatus = options.onStatus
    return initialization.promise
  })
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  const generate = vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(voiceClient.initialize).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()

  expect(voiceClient.dispose).toHaveBeenCalledOnce()
  expect(view.result.state().status).toBe('idle')
  reportProgress({fileName: '늦은 모델', loadedBytes: 1, totalBytes: 2})
  reportStatus('늦은 초기화 상태')
  expect(view.result.state().status).toBe('idle')

  initialization.resolve({ok: true, value: undefined})

  await vi.waitFor(() => expect(preparationMocks.prepareFeedGeneration).toHaveResolved())
  expect(view.result.state().status).toBe('idle')
  expect(generate).not.toHaveBeenCalled()
  view.cleanup()
})

it('should ignore a generated result when cancellation happens while its item loads', async () => {
  const job = createJob()
  const item = createItem()
  let finishItemLoad: () => void = () => undefined
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockImplementation(
    () =>
      new Promise((resolve) => {
        finishItemLoad = () => resolve([item])
      }),
  )
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    await options.prepareModel(job.modelId)
    return {job, status: 'ready'}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: job.script}],
    },
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.listItems).toHaveBeenCalledOnce())
  await view.result.cancelProcessing()
  finishItemLoad()

  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  expect(repositoryMocks.dialogueRepository.saveDialogue).not.toHaveBeenCalled()
  view.cleanup()
})

it('should remove generated audio when cancellation happens while it saves', async () => {
  const job = createJob()
  const item = createItem()
  let finishSave: () => void = () => undefined
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([
    {...job, status: 'interrupted'},
  ])
  repositoryMocks.dialogueRepository.saveDialogue.mockImplementation(
    () =>
      new Promise<void>((resolve) => {
        finishSave = resolve
      }),
  )
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementation(async (options) => {
    await options.prepareModel(job.modelId)
    return {job, status: 'ready'}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: job.script}],
    },
  })
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000021')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000022')
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.dialogueRepository.saveDialogue).toHaveBeenCalled())
  await view.result.cancelProcessing()
  finishSave()

  await vi.waitFor(() =>
    expect(repositoryMocks.dialogueRepository.deleteDialogue).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000021',
    ),
  )
  expect(repositoryMocks.feedRepository.complete).not.toHaveBeenCalled()
  view.cleanup()
})
