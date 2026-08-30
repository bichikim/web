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

const {preparationMocks, queueMocks, repositoryMocks, syncMocks} = getFeedTestMocks()

it('should prepare a model, report generation progress, and persist a failed job', async () => {
  const connection = createConnection()
  const job = createJob()
  const item = createItem()
  const initializeOptions: Array<Parameters<SupertonicClient['initialize']>[0]> = []
  const voiceClient = createVoiceClient()
  vi.mocked(voiceClient.initialize).mockImplementation(async (options) => {
    initializeOptions.push(options)
    options.onProgress({fileName: '모델', loadedBytes: 1, totalBytes: 2})
    options.onStatus('WASM 준비 중')
    return {ok: true, value: undefined}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  const generate = vi
    .spyOn(feedGenerationRuntime, 'generateDialogueAudio')
    .mockImplementation(async (options) => {
      options.onChunk?.(1, 2)
      return {message: '생성 실패', ok: false}
    })
  repositoryMocks.listConnections.mockReturnValue([connection])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    expect(await options.prepareModel('int8')).toBe(true)
    expect(await options.prepareModel('int8')).toBe(true)
    return {job, status: 'ready'}
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled())

  expect(generate).toHaveBeenCalledOnce()
  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledWith(
    expect.objectContaining({errorMessage: '생성 실패', status: 'failed'}),
    expect.objectContaining({message: '생성 실패', status: 'failed'}),
  )
  expect(initializeOptions).toHaveLength(1)
  expect(view.result.state().status).toBe('idle')
  initializeOptions[0]?.onStatus('다시 준비 중')
  expect(view.result.state()).toMatchObject({progress: null, status: 'preparing'})
  view.cleanup()
  initializeOptions[0]?.onProgress({fileName: '늦은 모델', loadedBytes: 2, totalBytes: 2})
  initializeOptions[0]?.onStatus('늦은 상태')
})

it.each([
  {
    message: '음성 모델 다운로드에 동의한 뒤 다시 시도해 주세요.',
    status: 'model-download-required' as const,
  },
  {
    message: '피드 음성 모델을 준비하지 못했어요.',
    status: 'model-preparation-failed' as const,
  },
])('should fail a job for $status preparation', async ({message, status}) => {
  const connection = createConnection()
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([connection])
  repositoryMocks.feedRepository.listJobs
    .mockResolvedValueOnce([job])
    .mockResolvedValue([createJob({id: 'failed-recovery', status: 'failed'})])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockResolvedValueOnce({job, status})
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled())

  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledWith(
    expect.objectContaining({errorMessage: message}),
    undefined,
  )
  view.cleanup()
})

it('should discard a queued job after its feed is unsubscribed', async () => {
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  queueMocks.scheduleFeedJobs.mockImplementationOnce((queue, jobIds, run) => {
    queue.push(...jobIds.map((id: string) => ({allowModelDownload: false, id})))
    repositoryMocks.listConnections.mockReturnValue([])
    void run()
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.deleteJobs).toHaveBeenCalled())

  expect(preparationMocks.prepareFeedGeneration).not.toHaveBeenCalled()
  view.cleanup()
})

it('should fail a ready job when preparation did not provide a client', async () => {
  const job = createJob()
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([createItem()])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockResolvedValueOnce({job, status: 'ready'})
  const view = renderHook(() => usePFeeds({events: createEventContext()}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalled())

  expect(repositoryMocks.feedRepository.updateJob).toHaveBeenCalledWith(
    expect.objectContaining({errorMessage: '피드 음성 모델을 준비하지 못했어요.'}),
    expect.any(Object),
  )
  view.cleanup()
})

it('should complete a generated feed dialogue and roll it back on metadata failure', async () => {
  const job = createJob()
  const item = createItem()
  const voiceClient = createVoiceClient()
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 소식'}],
    },
  })
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000001')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000002')
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    await options.prepareModel('int8')
    return {job, status: 'ready'}
  })
  const events = createEventContext()
  const view = renderHook(() => usePFeeds({events}))

  await vi.waitFor(() => expect(repositoryMocks.feedRepository.complete).toHaveBeenCalledOnce())

  expect(repositoryMocks.dialogueRepository.saveDialogue).toHaveBeenCalledWith(
    expect.objectContaining({
      dialogue: expect.objectContaining({id: '00000000-0000-4000-8000-000000000001'}),
    }),
  )
  expect(events.refreshDialogues).toHaveBeenCalled()
  view.cleanup()

  vi.clearAllMocks()
  repositoryMocks.feedRepository.complete.mockRejectedValueOnce(new Error('complete failed'))
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([item])
  syncMocks.synchronizeFeeds.mockResolvedValue({
    failures: [],
    queuedJobIds: [job.id],
    successfulConnections: 1,
  })
  preparationMocks.prepareFeedGeneration.mockImplementationOnce(async (options) => {
    await options.prepareModel('int8')
    return {job, status: 'ready'}
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 소식'}],
    },
  })
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000003')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000004')
  const rollbackView = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() =>
    expect(repositoryMocks.dialogueRepository.deleteDialogue).toHaveBeenCalledWith(
      '00000000-0000-4000-8000-000000000003',
    ),
  )
  rollbackView.cleanup()
})

it('should keep generation active while moving to the next queued feed dialogue', async () => {
  const firstJob = createJob({id: 'job-1', itemTitle: '첫 번째 피드', script: '첫 번째 소식'})
  const secondJob = createJob({
    feedItemId: 'item-2',
    id: 'job-2',
    itemTitle: '두 번째 피드',
    script: '두 번째 소식',
  })
  const firstItem = createItem({itemTitle: firstJob.itemTitle})
  const secondItem = createItem({
    feedItemId: secondJob.feedItemId,
    id: 'feed-1\u0000item-2',
    itemTitle: secondJob.itemTitle,
  })
  const voiceClient = createVoiceClient()
  let finishSecondGeneration: () => void = () => undefined
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(voiceClient)
  vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio')
    .mockResolvedValueOnce({
      ok: true,
      value: {
        audio: new Blob(['first audio']),
        durationMs: 1000,
        segments: [{durationMs: 1000, index: 0, startMs: 0, text: firstJob.script}],
      },
    })
    .mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          finishSecondGeneration = () => resolve({message: '테스트 종료', ok: false})
        }),
    )
  vi.spyOn(crypto, 'randomUUID')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000011')
    .mockReturnValueOnce('00000000-0000-4000-8000-000000000012')
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([firstJob, secondJob])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([firstItem, secondItem])
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

  await vi.waitFor(() =>
    expect(feedGenerationRuntime.generateDialogueAudio).toHaveBeenCalledTimes(2),
  )

  expect(repositoryMocks.feedRepository.complete).toHaveBeenCalledOnce()
  expect(view.result.state()).toEqual({
    message: '두 번째 피드 음성을 만들고 있어요.',
    progress: null,
    status: 'generating',
  })

  finishSecondGeneration()
  await vi.waitFor(() => expect(view.result.state().status).toBe('idle'))
  view.cleanup()
})
