import {
  createConnection,
  createEventContext,
  createItem,
  createJob,
  createVoiceClient,
  getFeedTestMocks,
} from './use-focus-room-feeds.fixture'
import {renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {feedGenerationRuntime} from '../generation-runtime'
import {usePFeeds} from '../use-focus-room-feeds'

const {repositoryMocks, syncMocks} = getFeedTestMocks()
afterEach(() => localStorage.removeItem('pomo:feed-auto-prepare:v1'))
it('should restore pending feeds without generation and prepare them only on user request', async () => {
  localStorage.setItem('pomo:feed-auto-prepare:v1', 'false')
  const job = createJob({status: 'pending'})
  repositoryMocks.listConnections.mockReturnValue([createConnection()])
  repositoryMocks.feedRepository.interruptUnfinishedJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listJobs.mockResolvedValue([job])
  repositoryMocks.feedRepository.listItems.mockResolvedValue([createItem()])
  repositoryMocks.feedRepository.retryJobs.mockImplementation(async () => {
    repositoryMocks.feedRepository.listJobs.mockResolvedValue([{...job, status: 'queued'}])
  })
  vi.spyOn(feedGenerationRuntime, 'createVoiceClient').mockResolvedValue(createVoiceClient())
  const generate = vi.spyOn(feedGenerationRuntime, 'generateDialogueAudio').mockResolvedValue({
    ok: true,
    value: {
      audio: new Blob(['audio']),
      durationMs: 1000,
      segments: [{durationMs: 1000, index: 0, startMs: 0, text: '새 소식'}],
    },
  })
  const view = renderHook(() => usePFeeds({events: createEventContext()}))
  await vi.waitFor(() => expect(syncMocks.synchronizeFeeds).toHaveBeenCalled())
  expect(syncMocks.synchronizeFeeds).toHaveBeenCalledWith(
    expect.objectContaining({autoPrepare: false}),
  )
  expect(view.result.recoveryJobs()).toEqual([job])
  expect(generate).not.toHaveBeenCalled()
  await view.result.retryRecovery()
  await vi.waitFor(() => expect(repositoryMocks.feedRepository.complete).toHaveBeenCalledOnce())
  expect(generate).toHaveBeenCalledOnce()
  expect(view.result.recoveryJobs()).toEqual([])
  view.cleanup()
})
