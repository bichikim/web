import {createHash, randomUUID} from 'node:crypto'
import {and, eq, inArray, isNull, lt} from 'drizzle-orm'

import {
  type HistoryGenerationOutput,
  type HistoryTargetDate,
  renderHistoryContentHtml,
} from 'src/features/history-generation'
import {
  type Database,
  feedChannels,
  getDatabase,
  historicalGenerationRuns,
  historicalMoments,
  historicalMomentSources,
  processedOpenAiWebhookEvents,
  type TransactionalDatabase,
  withTransactionalDatabase,
} from '../database'

const CHANNEL_SLUG = 'today-in-history'
const MAX_RECOVERY_RUNS = 10
const MAX_GENERATION_ATTEMPTS = 2
const MINUTES_PER_STALE_PREPARING_DELAY = 30
const SECONDS_PER_MINUTE = 60
const MILLISECONDS_PER_SECOND = 1000
const STALE_PREPARING_DELAY_MS =
  MINUTES_PER_STALE_PREPARING_DELAY * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND

export interface GenerationRun {
  readonly id: string
  readonly openAiResponseId: string | null
  readonly openAiSubmissionKey: string
  readonly sourcePolicyVersion: string
  readonly status: 'preparing' | 'submitted' | 'completed' | 'failed' | 'rejected'
  readonly targetDate: string
}

export interface PreparedGenerationRun {
  readonly created: boolean
  readonly run: GenerationRun
}

export interface RecoverableGenerationRun {
  readonly responseId: string
}

interface CreateRunOptions {
  readonly promptVersion: string
  readonly sourcePolicyVersion: string
  readonly targetDate: HistoryTargetDate
}

interface PrepareRerunOptions extends CreateRunOptions {
  readonly requiredTitles: ReadonlyArray<string>
}

interface PublishResponseOptions {
  readonly eventId: string
  readonly generation: HistoryGenerationOutput
  readonly model: string
  readonly responseId: string
  readonly replaceDate: boolean
  readonly searchSourceUrls: ReadonlyArray<string>
}

interface FinishResponseOptions {
  readonly eventId: string
  readonly message: string
  readonly responseId: string
  readonly status: 'failed' | 'rejected'
}

const createStableKey = (moment: HistoryGenerationOutput['moments'][number]): string => {
  const normalizedTitle = moment.title.normalize('NFKC').trim().toLocaleLowerCase('ko-KR')
  const identity = `${moment.historicalEra}:${moment.eventYear}:${normalizedTitle}`

  return `history:${createHash('sha256').update(identity).digest('hex')}`
}

const getChannelId = async (database: Database): Promise<string> => {
  const [channel] = await database
    .select({id: feedChannels.id})
    .from(feedChannels)
    .where(and(eq(feedChannels.slug, CHANNEL_SLUG), eq(feedChannels.enabled, true)))
    .limit(1)

  if (channel === undefined) {
    throw new Error(`Enabled feed channel not found: ${CHANNEL_SLUG}`)
  }

  return channel.id
}

const mapRun = (run: typeof historicalGenerationRuns.$inferSelect): GenerationRun => ({
  id: run.id,
  openAiResponseId: run.openAiResponseId,
  openAiSubmissionKey: run.openAiSubmissionKey,
  sourcePolicyVersion: run.sourcePolicyVersion,
  status: run.status,
  targetDate: run.targetDate,
})

const canPrepareRerun = (
  run: typeof historicalGenerationRuns.$inferSelect,
  stalePreparingBefore: Date,
): boolean => {
  switch (run.status) {
    case 'completed':
    case 'failed':
    case 'rejected':
      return true
    case 'preparing':
      return run.openAiResponseId === null && run.updatedAt < stalePreparingBefore
    case 'submitted':
      return false
    default: {
      const unhandledStatus: never = run.status
      throw new Error(`Unhandled generation status: ${unhandledStatus}`)
    }
  }
}

/** Creates the unique daily generation run or returns the existing run. */
export const prepareGenerationRun = async (
  options: CreateRunOptions,
  database: Database = getDatabase(),
): Promise<PreparedGenerationRun> => {
  const channelId = await getChannelId(database)
  const [inserted] = await database
    .insert(historicalGenerationRuns)
    .values({
      channelId,
      promptVersion: options.promptVersion,
      sourcePolicyVersion: options.sourcePolicyVersion,
      targetDate: options.targetDate.isoDate,
    })
    .onConflictDoNothing()
    .returning()

  if (inserted !== undefined) {
    return {created: true, run: mapRun(inserted)}
  }

  const [existing] = await database
    .select()
    .from(historicalGenerationRuns)
    .where(
      and(
        eq(historicalGenerationRuns.channelId, channelId),
        eq(historicalGenerationRuns.targetDate, options.targetDate.isoDate),
      ),
    )
    .limit(1)

  if (existing === undefined) {
    throw new Error('Generation run disappeared after a uniqueness conflict')
  }

  if (existing.status === 'failed' && existing.attemptCount < MAX_GENERATION_ATTEMPTS) {
    const [retried] = await database
      .update(historicalGenerationRuns)
      .set({
        attemptCount: existing.attemptCount + 1,
        errorMessage: null,
        openAiResponseId: null,
        openAiSubmissionKey:
          existing.openAiResponseId === null ? existing.openAiSubmissionKey : randomUUID(),
        status: 'preparing',
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(historicalGenerationRuns.id, existing.id),
          eq(historicalGenerationRuns.status, 'failed'),
          eq(historicalGenerationRuns.attemptCount, existing.attemptCount),
        ),
      )
      .returning()

    if (retried !== undefined) {
      return {created: true, run: mapRun(retried)}
    }
  }

  const stalePreparingBefore = new Date(Date.now() - STALE_PREPARING_DELAY_MS)

  if (
    existing.status === 'preparing' &&
    existing.openAiResponseId === null &&
    existing.updatedAt < stalePreparingBefore
  ) {
    const [reclaimed] = await database
      .update(historicalGenerationRuns)
      .set({
        errorMessage: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(historicalGenerationRuns.id, existing.id),
          eq(historicalGenerationRuns.status, 'preparing'),
          isNull(historicalGenerationRuns.openAiResponseId),
          lt(historicalGenerationRuns.updatedAt, stalePreparingBefore),
        ),
      )
      .returning()

    if (reclaimed !== undefined) {
      return {created: true, run: mapRun(reclaimed)}
    }
  }

  return {created: false, run: mapRun(existing)}
}

/** Reopens an inactive daily run so its published moments can be regenerated. */
export const prepareGenerationRerun = async (
  options: PrepareRerunOptions,
  database: Database = getDatabase(),
): Promise<GenerationRun> => {
  const channelId = await getChannelId(database)
  const selectedMoments = await database
    .select({title: historicalMoments.title})
    .from(historicalMoments)
    .where(
      and(
        eq(historicalMoments.channelId, channelId),
        eq(historicalMoments.eventMonth, options.targetDate.month),
        eq(historicalMoments.eventDay, options.targetDate.day),
        eq(historicalMoments.status, 'published'),
        inArray(historicalMoments.title, [...options.requiredTitles]),
      ),
    )
  const selectedTitles = new Set(selectedMoments.map((moment) => moment.title))

  if (options.requiredTitles.some((title) => !selectedTitles.has(title))) {
    throw new Error('Every regeneration title must match an existing published moment')
  }

  const [existing] = await database
    .select()
    .from(historicalGenerationRuns)
    .where(
      and(
        eq(historicalGenerationRuns.channelId, channelId),
        eq(historicalGenerationRuns.targetDate, options.targetDate.isoDate),
      ),
    )
    .limit(1)
  const stalePreparingBefore = new Date(Date.now() - STALE_PREPARING_DELAY_MS)

  if (existing === undefined || !canPrepareRerun(existing, stalePreparingBefore)) {
    throw new Error(`Inactive generation run not found: ${options.targetDate.isoDate}`)
  }

  const claimCondition =
    existing.status === 'preparing'
      ? lt(historicalGenerationRuns.updatedAt, stalePreparingBefore)
      : eq(historicalGenerationRuns.attemptCount, existing.attemptCount)

  const [updated] = await database
    .update(historicalGenerationRuns)
    .set({
      attemptCount: MAX_GENERATION_ATTEMPTS,
      completedAt: null,
      errorMessage: null,
      openAiResponseId: null,
      openAiSubmissionKey:
        existing.openAiResponseId === null ? existing.openAiSubmissionKey : randomUUID(),
      promptVersion: options.promptVersion,
      sourcePolicyVersion: options.sourcePolicyVersion,
      status: 'preparing',
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(historicalGenerationRuns.id, existing.id),
        eq(historicalGenerationRuns.status, existing.status),
        claimCondition,
      ),
    )
    .returning()

  if (updated === undefined) {
    throw new Error(`Inactive generation run not found: ${options.targetDate.isoDate}`)
  }

  return mapRun(updated)
}

/** Associates an OpenAI background response with a prepared generation run. */
export const markGenerationSubmitted = async (
  runId: string,
  responseId: string,
  database: Database = getDatabase(),
): Promise<void> => {
  await database
    .update(historicalGenerationRuns)
    .set({
      errorMessage: null,
      openAiResponseId: responseId,
      status: 'submitted',
      updatedAt: new Date(),
    })
    .where(eq(historicalGenerationRuns.id, runId))
}

/** Records a generation failure without exposing it through the public feed. */
export const markGenerationFailed = async (
  runId: string,
  errorMessage: string,
  database: Database = getDatabase(),
): Promise<void> => {
  await database
    .update(historicalGenerationRuns)
    .set({errorMessage, status: 'failed', updatedAt: new Date()})
    .where(
      and(
        eq(historicalGenerationRuns.id, runId),
        eq(historicalGenerationRuns.status, 'preparing'),
        isNull(historicalGenerationRuns.openAiResponseId),
      ),
    )
}

/** Finds the local generation run owned by an OpenAI response. */
export const findGenerationRun = async (
  responseId: string,
  database: Database = getDatabase(),
): Promise<GenerationRun | undefined> => {
  const [run] = await database
    .select()
    .from(historicalGenerationRuns)
    .where(eq(historicalGenerationRuns.openAiResponseId, responseId))
    .limit(1)

  return run === undefined ? undefined : mapRun(run)
}

const claimWebhookEvent = async (
  eventId: string,
  database: Parameters<Parameters<TransactionalDatabase['transaction']>[0]>[0],
): Promise<boolean> => {
  const [inserted] = await database
    .insert(processedOpenAiWebhookEvents)
    .values({eventId})
    .onConflictDoNothing()
    .returning({eventId: processedOpenAiWebhookEvents.eventId})

  return inserted !== undefined
}

const publishHistoryResponseWithDatabase = async (
  options: PublishResponseOptions,
  database: TransactionalDatabase,
): Promise<boolean> =>
  database.transaction(async (transaction) => {
    if (!(await claimWebhookEvent(options.eventId, transaction))) {
      return false
    }

    const [run] = await transaction
      .select()
      .from(historicalGenerationRuns)
      .where(eq(historicalGenerationRuns.openAiResponseId, options.responseId))
      .for('update')
      .limit(1)

    if (run === undefined) {
      throw new Error(`Generation run not found for response: ${options.responseId}`)
    }

    if (run.status !== 'submitted') {
      return false
    }

    const publishedAt = new Date()

    if (options.replaceDate) {
      const [firstMoment] = options.generation.moments

      if (firstMoment === undefined) {
        throw new Error('A generation must contain at least one historical moment')
      }

      await transaction
        .update(historicalMoments)
        .set({status: 'archived', updatedAt: publishedAt})
        .where(
          and(
            eq(historicalMoments.channelId, run.channelId),
            eq(historicalMoments.eventMonth, firstMoment.eventMonth),
            eq(historicalMoments.eventDay, firstMoment.eventDay),
            eq(historicalMoments.status, 'published'),
          ),
        )
    }

    for (const moment of options.generation.moments) {
      const stableKey = createStableKey(moment)
      // Each source row depends on the generated moment ID in the same transaction.
      // eslint-disable-next-line no-await-in-loop
      const [storedMoment] = await transaction
        .insert(historicalMoments)
        .values({
          channelId: run.channelId,
          contentHtml: renderHistoryContentHtml(moment),
          eventDay: moment.eventDay,
          eventMonth: moment.eventMonth,
          eventYear: moment.eventYear,
          generationModel: options.model,
          historicalEra: moment.historicalEra,
          publishedAt,
          stableKey,
          status: 'published',
          summary: moment.summary,
          title: moment.title,
        })
        .onConflictDoUpdate({
          set: {
            contentHtml: renderHistoryContentHtml(moment),
            generationModel: options.model,
            publishedAt,
            status: 'published',
            summary: moment.summary,
            title: moment.title,
            updatedAt: publishedAt,
          },
          target: [historicalMoments.channelId, historicalMoments.stableKey],
        })
        .returning({id: historicalMoments.id})

      if (storedMoment === undefined) {
        throw new Error('Failed to persist a generated historical moment')
      }

      // Keep source replacement ordered inside the transaction for deterministic retries.
      // eslint-disable-next-line no-await-in-loop
      await transaction
        .delete(historicalMomentSources)
        .where(eq(historicalMomentSources.momentId, storedMoment.id))
      // eslint-disable-next-line no-await-in-loop
      await transaction.insert(historicalMomentSources).values(
        moment.sources.map((source, sortOrder) => ({
          momentId: storedMoment.id,
          publisher: source.publisher,
          sortOrder,
          title: source.title,
          url: source.url,
        })),
      )
    }

    await transaction
      .update(historicalGenerationRuns)
      .set({
        completedAt: publishedAt,
        errorMessage: null,
        sourceUrls: [...options.searchSourceUrls],
        status: 'completed',
        updatedAt: publishedAt,
      })
      .where(eq(historicalGenerationRuns.id, run.id))

    return true
  })

/** Publishes a completed response atomically and ignores duplicate webhook events. */
export const publishHistoryResponse = (
  options: PublishResponseOptions,
  database?: TransactionalDatabase,
): Promise<boolean> =>
  database === undefined
    ? withTransactionalDatabase((scopedDatabase) =>
        publishHistoryResponseWithDatabase(options, scopedDatabase),
      )
    : publishHistoryResponseWithDatabase(options, database)

const finishHistoryResponseWithDatabase = async (
  options: FinishResponseOptions,
  database: TransactionalDatabase,
): Promise<boolean> =>
  database.transaction(async (transaction) => {
    if (!(await claimWebhookEvent(options.eventId, transaction))) {
      return false
    }

    const [run] = await transaction
      .select()
      .from(historicalGenerationRuns)
      .where(eq(historicalGenerationRuns.openAiResponseId, options.responseId))
      .for('update')
      .limit(1)

    if (run === undefined) {
      throw new Error(`Generation run not found for response: ${options.responseId}`)
    }

    if (run.status !== 'submitted') {
      return false
    }

    await transaction
      .update(historicalGenerationRuns)
      .set({errorMessage: options.message, status: options.status, updatedAt: new Date()})
      .where(eq(historicalGenerationRuns.id, run.id))

    return true
  })

/** Records a terminal OpenAI event atomically and ignores duplicate delivery. */
const finishHistoryResponse = (
  options: FinishResponseOptions,
  database?: TransactionalDatabase,
): Promise<boolean> =>
  database === undefined
    ? withTransactionalDatabase((scopedDatabase) =>
        finishHistoryResponseWithDatabase(options, scopedDatabase),
      )
    : finishHistoryResponseWithDatabase(options, database)

/** Records an OpenAI processing failure that may be retried once. */
export const failHistoryResponse = (
  eventId: string,
  responseId: string,
  message: string,
  database?: TransactionalDatabase,
): Promise<boolean> =>
  finishHistoryResponse({eventId, message, responseId, status: 'failed'}, database)

/** Records a permanent content-contract rejection. */
export const rejectHistoryResponse = (
  eventId: string,
  responseId: string,
  message: string,
  database?: TransactionalDatabase,
): Promise<boolean> =>
  finishHistoryResponse({eventId, message, responseId, status: 'rejected'}, database)

/** Lists submitted responses whose webhook may have been missed. */
export const listRecoverableGenerationRuns = async (
  updatedBefore: Date,
  database: Database = getDatabase(),
): Promise<ReadonlyArray<RecoverableGenerationRun>> => {
  const runs = await database
    .select({responseId: historicalGenerationRuns.openAiResponseId})
    .from(historicalGenerationRuns)
    .where(
      and(
        eq(historicalGenerationRuns.status, 'submitted'),
        lt(historicalGenerationRuns.updatedAt, updatedBefore),
      ),
    )
    .limit(MAX_RECOVERY_RUNS)

  return runs.flatMap((run) => (run.responseId === null ? [] : [{responseId: run.responseId}]))
}
