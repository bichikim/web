/** @vitest-environment node */
import {afterEach, describe, expect, it, vi} from 'vitest'

import {
  createOffsetListController,
  type OffsetListPage,
} from '../features/feature-requests/create-offset-list-controller'
import type {FeatureRequest} from '../features/feature-requests/types'

const makeRequest = (id: string): FeatureRequest => ({
  createdAt: '2026-01-01T00:00:00.000Z',
  description: `desc-${id}`,
  id,
  status: 'requested',
  targetVoteCount: null,
  title: `title-${id}`,
  voteCount: 0,
  votedByCurrentUser: false,
})

const page = (ids: readonly string[], hasMore: boolean): OffsetListPage => ({
  hasMore,
  requests: ids.map(makeRequest),
})

describe('createOffsetListController refresh after loadMore', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('should advance loadMore offset by the number of loaded rows, not only the first refreshed page', async () => {
    const loadPage = vi.fn(
      async (options?: {readonly offset?: number}): Promise<OffsetListPage> => {
        const offset = options?.offset ?? 0

        if (offset === 0) {
          return page(['a-1', 'a-2'], true)
        }
        if (offset === 2) {
          return page(['b-1', 'b-2'], true)
        }
        if (offset === 4) {
          return page(['c-1'], false)
        }

        throw new Error(`unexpected offset ${offset}`)
      },
    )

    const controller = createOffsetListController({loadPage})

    await controller.refresh()
    await controller.loadMore()
    expect(controller.requests().map((request) => request.id)).toEqual(['a-1', 'a-2', 'b-1', 'b-2'])

    await controller.refresh()
    loadPage.mockClear()

    await controller.loadMore()

    expect(loadPage).toHaveBeenCalledOnce()
    expect(loadPage).toHaveBeenCalledWith({offset: 4})
  })
})
