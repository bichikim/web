import {expect, it, vi} from 'vitest'

import type {FeedDialogueJob} from '../feed-dialogue-schema'
import {processScheduledFeedJob, type ScheduledFeedJob, scheduleFeedJobs} from '../generation-queue'

const JOB = {
  id: 'job-1',
  modelId: 'full',
  status: 'queued',
} as FeedDialogueJob

it('should preserve model download approval when a queued job is scheduled again', () => {
  const queue: Array<ScheduledFeedJob> = []
  const run = vi.fn(async () => undefined)

  scheduleFeedJobs(queue, [JOB.id], run)
  scheduleFeedJobs(queue, [JOB.id], run, true)

  expect(queue).toEqual([{allowModelDownload: true, id: JOB.id}])
  expect(run).toHaveBeenCalledTimes(2)
})

it('should pass model download approval to the feed generator', async () => {
  const generate = vi.fn(async () => undefined)

  await processScheduledFeedJob({
    generate,
    handleFailure: vi.fn(async () => undefined),
    listJobs: vi.fn(async () => [JOB]),
    scheduledJob: {allowModelDownload: true, id: JOB.id},
  })

  expect(generate).toHaveBeenCalledWith(JOB, true)
})

it('should route generation failures through the existing recovery path', async () => {
  const error = new Error('generation failed')
  const handleFailure = vi.fn(async () => undefined)

  await processScheduledFeedJob({
    generate: vi.fn(async () => Promise.reject(error)),
    handleFailure,
    listJobs: vi.fn(async () => [JOB]),
    scheduledJob: {allowModelDownload: false, id: JOB.id},
  })

  expect(handleFailure).toHaveBeenCalledWith(JOB, error)
})

it('should ignore a missing or no-longer-queued scheduled job', async () => {
  const generate = vi.fn()
  const options = {
    generate,
    handleFailure: vi.fn(),
    listJobs: vi.fn(async () => [{...JOB, status: 'ready'} as unknown as FeedDialogueJob]),
    scheduledJob: {allowModelDownload: false, id: JOB.id},
  }

  await processScheduledFeedJob(options)
  options.listJobs.mockResolvedValueOnce([])
  await processScheduledFeedJob(options)

  expect(generate).not.toHaveBeenCalled()
})

it('should avoid duplicate jobs, skip empty runs, and report run failures', async () => {
  const queue: Array<ScheduledFeedJob> = [{allowModelDownload: true, id: JOB.id}]
  const failure = new Error('queue failed')
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)
  const run = vi.fn(async () => Promise.reject(failure))

  scheduleFeedJobs(queue, [], run)
  scheduleFeedJobs(queue, [JOB.id], run)
  await vi.waitFor(() =>
    expect(consoleError).toHaveBeenCalledWith('Unexpected feed generation queue failure.', failure),
  )

  expect(queue).toEqual([{allowModelDownload: true, id: JOB.id}])
  expect(run).toHaveBeenCalledOnce()
})
