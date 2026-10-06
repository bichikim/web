import {query, revalidate} from '@solidjs/router'
import {withPagination} from 'src/utils/with-pagination'

import {listAdminFeatureRequests, listFeatureRequests} from './api'
import type {FeatureRequestPage} from './types'

const pagination = {
  getNextPageParam: (
    page: FeatureRequestPage,
    _pages: ReadonlyArray<FeatureRequestPage>,
    offset: number,
  ) => (page.hasMore ? offset + page.requests.length : null),
  initialPageParam: 0,
}

export const featureRequestsQuery = withPagination(
  query((_scope: string, offset: number) => listFeatureRequests({offset}), 'feature-requests-page'),
  pagination,
)
export const adminFeatureRequestsQuery = withPagination(
  query(
    (_scope: string, offset: number) => listAdminFeatureRequests({offset}),
    'admin-feature-requests-page',
  ),
  pagination,
)

/** Invalidates all offsets affected by request ordering or membership changes. */
export const invalidateFeatureRequestPages = (): Promise<void> =>
  revalidate([featureRequestsQuery.key, adminFeatureRequestsQuery.key])
