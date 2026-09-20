import {clamp} from 'es-toolkit/math'
import {asc, desc, eq, sql} from 'drizzle-orm'

import {
  featureRequests,
  featureRequestStatusEnum,
  featureRequestVotes,
  getDatabase,
  withTransactionalDatabase,
} from 'src/server/database'

export type FeatureRequestStatus = (typeof featureRequestStatusEnum.enumValues)[number]

export interface FeatureRequestListItem {
  readonly createdAt: string
  readonly description: string
  readonly id: string
  readonly status: FeatureRequestStatus
  readonly targetVoteCount: number | null
  readonly title: string
  readonly voteCount: number
  readonly votedByCurrentUser: boolean
}

export interface CreateFeatureRequestInput {
  readonly description: string
  readonly title: string
  readonly userId: string
}

export interface UpdateFeatureRequestStatusInput {
  readonly requestId: string
  readonly status: FeatureRequestStatus
  readonly targetVoteCount?: number | null
}

export type VoteFeatureRequestResult =
  | {readonly status: 'already-voted'}
  | {readonly status: 'closed'}
  | {readonly status: 'not-found'}
  | {readonly status: 'voted'}

export type UpdateFeatureRequestStatusResult =
  | {readonly code: 'feature_request_not_found'; readonly success: false}
  | {readonly code: 'feature_request_target_required'; readonly success: false}
  | {readonly success: true}

const featureRequestStatusOrder = sql<number>`case
  when ${featureRequests.status} = 'voting' then 0
  when ${featureRequests.status} = 'confirmed' then 1
  when ${featureRequests.status} = 'requested' then 2
  else 3
end`
const DEFAULT_FEATURE_REQUEST_PAGE_SIZE = 20
const MAXIMUM_FEATURE_REQUEST_PAGE_SIZE = 50

export interface FeatureRequestListOptions {
  readonly limit?: number
  readonly offset?: number
}

export interface FeatureRequestListPage {
  readonly hasMore: boolean
  readonly requests: ReadonlyArray<FeatureRequestListItem>
}

const createVotedByCurrentUserExpression = (userId: string | null) =>
  userId === null
    ? sql<boolean>`false`
    : sql<boolean>`exists (
        select 1
        from ${featureRequestVotes}
        where ${featureRequestVotes.requestId} = ${featureRequests.id}
          and ${featureRequestVotes.userId} = ${userId}
      )`

const toFeatureRequestListItem = (row: {
  readonly createdAt: Date
  readonly description: string
  readonly id: string
  readonly status: FeatureRequestStatus
  readonly targetVoteCount: number | null
  readonly title: string
  readonly voteCount: number
  readonly votedByCurrentUser: boolean
}): FeatureRequestListItem => ({
  createdAt: row.createdAt.toISOString(),
  description: row.description,
  id: row.id,
  status: row.status,
  targetVoteCount: row.targetVoteCount,
  title: row.title,
  voteCount: row.voteCount,
  votedByCurrentUser: row.votedByCurrentUser,
})

export const listFeatureRequests = async (
  userId: string | null,
  options: FeatureRequestListOptions = {},
): Promise<FeatureRequestListPage> => {
  const pageSize = clamp(
    options.limit ?? DEFAULT_FEATURE_REQUEST_PAGE_SIZE,
    1,
    MAXIMUM_FEATURE_REQUEST_PAGE_SIZE,
  )
  const offset = Math.max(options.offset ?? 0, 0)
  const voteCount = sql<number>`(
    select count(*)
    from ${featureRequestVotes}
    where ${featureRequestVotes.requestId} = ${featureRequests.id}
  )`.mapWith(Number)
  const rows = await getDatabase()
    .select({
      createdAt: featureRequests.createdAt,
      description: featureRequests.description,
      id: featureRequests.id,
      status: featureRequests.status,
      targetVoteCount: featureRequests.targetVoteCount,
      title: featureRequests.title,
      voteCount,
      votedByCurrentUser: createVotedByCurrentUserExpression(userId),
    })
    .from(featureRequests)
    .orderBy(
      asc(featureRequestStatusOrder),
      desc(voteCount),
      desc(featureRequests.createdAt),
      asc(featureRequests.id),
    )
    .limit(pageSize + 1)
    .offset(offset)

  return {
    hasMore: rows.length > pageSize,
    requests: rows.slice(0, pageSize).map(toFeatureRequestListItem),
  }
}

export const listAdminFeatureRequests = (
  options: FeatureRequestListOptions = {},
): Promise<FeatureRequestListPage> => listFeatureRequests(null, options)

export const createFeatureRequest = async (
  input: CreateFeatureRequestInput,
): Promise<{readonly id: string}> => {
  const [request] = await getDatabase()
    .insert(featureRequests)
    .values({
      description: input.description,
      title: input.title,
      userId: input.userId,
    })
    .returning({id: featureRequests.id})

  if (request === undefined) {
    throw new Error('Failed to create a feature request')
  }

  return request
}

export const voteFeatureRequest = async (
  requestId: string,
  userId: string,
): Promise<VoteFeatureRequestResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [request] = await transaction
        .select({status: featureRequests.status})
        .from(featureRequests)
        .where(eq(featureRequests.id, requestId))
        .for('update')
        .limit(1)

      if (request === undefined) {
        return {status: 'not-found'}
      }

      if (request.status === 'confirmed' || request.status === 'completed') {
        return {status: 'closed'}
      }

      const insertedVotes = await transaction
        .insert(featureRequestVotes)
        .values({requestId, userId})
        .onConflictDoNothing()
        .returning({requestId: featureRequestVotes.requestId})

      return insertedVotes.length === 0 ? {status: 'already-voted'} : {status: 'voted'}
    }),
  )

export const updateFeatureRequestStatus = async (
  input: UpdateFeatureRequestStatusInput,
): Promise<UpdateFeatureRequestStatusResult> =>
  withTransactionalDatabase((database) =>
    database.transaction(async (transaction) => {
      const [request] = await transaction
        .select({targetVoteCount: featureRequests.targetVoteCount})
        .from(featureRequests)
        .where(eq(featureRequests.id, input.requestId))
        .limit(1)

      if (request === undefined) {
        return {code: 'feature_request_not_found', success: false}
      }

      const targetVoteCount =
        input.status === 'requested' || input.status === 'completed'
          ? null
          : (input.targetVoteCount ?? request.targetVoteCount)
      const requiresTarget = input.status === 'voting' || input.status === 'confirmed'

      if (requiresTarget && (targetVoteCount === null || targetVoteCount < 1)) {
        return {code: 'feature_request_target_required', success: false}
      }

      const updated = await transaction
        .update(featureRequests)
        .set({status: input.status, targetVoteCount, updatedAt: new Date()})
        .where(eq(featureRequests.id, input.requestId))
        .returning({id: featureRequests.id})

      return updated.length === 0
        ? {code: 'feature_request_not_found', success: false}
        : {success: true}
    }),
  )
