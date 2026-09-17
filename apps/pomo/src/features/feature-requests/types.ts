export const FEATURE_REQUEST_STATUSES = ['requested', 'voting', 'confirmed', 'completed'] as const

export type FeatureRequestStatus = (typeof FEATURE_REQUEST_STATUSES)[number]

export interface FeatureRequest {
  readonly createdAt: string
  readonly description: string
  readonly id: string
  readonly status: FeatureRequestStatus
  readonly targetVoteCount: number | null
  readonly title: string
  readonly voteCount: number
  readonly votedByCurrentUser: boolean
}

export interface FeatureRequestPage {
  readonly hasMore: boolean
  readonly requests: ReadonlyArray<FeatureRequest>
}

export interface FeatureRequestListOptions {
  readonly offset?: number
}

export interface CreateFeatureRequestInput {
  readonly description: string
  readonly title: string
}
