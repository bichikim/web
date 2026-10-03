import {query, revalidate} from '@solidjs/router'

import {listAdminFeatureRequests, listFeatureRequests} from './api'

export const featureRequestsQuery = query(
  (_scope: string, offset: number) => listFeatureRequests({offset}),
  'feature-requests-page',
)
export const adminFeatureRequestsQuery = query(
  (_scope: string, offset: number) => listAdminFeatureRequests({offset}),
  'admin-feature-requests-page',
)

/** Invalidates all offsets affected by request ordering or membership changes. */
export const invalidateFeatureRequestPages = (): Promise<void> =>
  revalidate([featureRequestsQuery.key, adminFeatureRequestsQuery.key])
