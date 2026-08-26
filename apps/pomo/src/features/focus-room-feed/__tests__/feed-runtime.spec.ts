import {expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({httpFetch: vi.fn()}))

vi.mock('../../http-client', () => ({httpFetch: mocks.httpFetch}))

import {
  createFeedFetcher,
  findRemovableExpiredDialogues,
  getFeedGenerationProgress,
} from '../feed-runtime'

it('should calculate bounded generation progress', () => {
  expect(getFeedGenerationProgress(1, 3)).toBe(33)
  expect(getFeedGenerationProgress(4, 3)).toBe(100)
})

it('should create a no-store feed request with a bounded timeout', () => {
  const signal = AbortSignal.abort()
  vi.spyOn(AbortSignal, 'timeout').mockReturnValue(signal)
  mocks.httpFetch.mockReturnValue('response')

  expect(createFeedFetcher()('/api/feed')).toBe('response')
  expect(mocks.httpFetch).toHaveBeenCalledWith('/api/feed', {cache: 'no-store', signal})
  expect(AbortSignal.timeout).toHaveBeenCalledWith(15_000)
})

it('should keep only expired dialogues that are not scheduled', () => {
  const expired = [{dialogueId: 'scheduled'}, {dialogueId: 'removable'}] as unknown as Parameters<
    typeof findRemovableExpiredDialogues
  >[0]['expired']

  expect(
    findRemovableExpiredDialogues({
      expired,
      isDialogueScheduled: (dialogueId) => dialogueId === 'scheduled',
    }),
  ).toEqual([expired[1]])
})
