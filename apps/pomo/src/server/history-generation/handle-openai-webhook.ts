import {invalidateByTag} from '@vercel/functions'
import {z, ZodError} from 'zod'

import {HISTORY_SOURCE_POLICY, validateHistoryOutput} from 'src/features/history-generation'
import {
  failHistoryResponse,
  findGenerationRun,
  publishHistoryResponse,
  rejectHistoryResponse,
} from './generation-repository'
import {retrieveHistoryResponse} from './response-result'

const MAX_ERROR_LENGTH = 2000
const MIN_MOMENT_COUNT = 3
const MAX_MOMENT_COUNT = 5
const MAX_TITLE_LENGTH = 50

const requiredTitlesSchema = z
  .array(z.string().trim().min(1).max(MAX_TITLE_LENGTH))
  .min(MIN_MOMENT_COUNT)
  .max(MAX_MOMENT_COUNT)

interface ResponseWebhookEvent {
  readonly data: {readonly id: string}
  readonly id: string
  readonly type:
    | 'response.cancelled'
    | 'response.completed'
    | 'response.failed'
    | 'response.incomplete'
}

const isContractError = (error: unknown): boolean =>
  error instanceof TypeError || error instanceof SyntaxError || error instanceof ZodError

const getTargetMonthDay = (targetDate: string): {day: number; month: number} => {
  const [, month, day] = targetDate.split('-').map(Number)

  if (!Number.isInteger(month) || !Number.isInteger(day)) {
    throw new TypeError('Generation run has an invalid target date')
  }

  return {day, month}
}

const getRequiredTitles = (
  metadata: Readonly<Record<string, string>>,
): ReadonlyArray<string> | undefined => {
  const serializedTitles = metadata.required_titles

  return serializedTitles === undefined
    ? undefined
    : requiredTitlesSchema.parse(JSON.parse(serializedTitles))
}

/** Processes one verified OpenAI response event. */
export const handleOpenAiResponseEvent = async (event: ResponseWebhookEvent): Promise<void> => {
  const responseId = event.data.id

  if (event.type !== 'response.completed') {
    await failHistoryResponse(event.id, responseId, `OpenAI ended with ${event.type}`)
    return
  }

  const run = await findGenerationRun(responseId)

  if (run === undefined) {
    throw new Error(`Generation run not found for response: ${responseId}`)
  }

  if (run.sourcePolicyVersion !== HISTORY_SOURCE_POLICY.version) {
    await rejectHistoryResponse(event.id, responseId, 'Unsupported source policy version')
    return
  }

  try {
    const response = await retrieveHistoryResponse(responseId)
    const target = getTargetMonthDay(run.targetDate)

    if (response.status !== 'completed') {
      throw new TypeError(`OpenAI response is not complete: ${response.status}`)
    }

    if (response.metadata.generation_run_id !== run.id) {
      throw new TypeError('OpenAI response metadata does not match the generation run')
    }

    const requiredTitles = getRequiredTitles(response.metadata)
    const generation = validateHistoryOutput({
      outputText: response.outputText,
      policy: HISTORY_SOURCE_POLICY,
      requiredTitles,
      searchSourceUrls: response.searchSourceUrls,
      targetDay: target.day,
      targetMonth: target.month,
    })
    await publishHistoryResponse({
      eventId: event.id,
      generation,
      model: response.model,
      replaceDate: requiredTitles === undefined,
      responseId,
      searchSourceUrls: response.searchSourceUrls,
    })

    await invalidateByTag('feed:today-in-history')
  } catch (error) {
    if (!isContractError(error)) {
      throw error
    }

    const message = error instanceof Error ? error.message : 'Invalid OpenAI response'
    await rejectHistoryResponse(event.id, responseId, message.slice(0, MAX_ERROR_LENGTH))
  }
}
