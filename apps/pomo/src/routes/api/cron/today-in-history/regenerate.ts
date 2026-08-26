import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import type {HistoryTargetDate} from 'src/features/history-generation'
import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {startHistoryRegeneration} from 'src/server/history-generation/start-regeneration'
import {readJsonBody} from 'src/server/http/body'
import {noStoreJson, noStoreText} from 'src/server/http/response'

const ACCEPTED_STATUS = 202
const HTTP_BAD_REQUEST = 400
const HTTP_UNAUTHORIZED = 401
const HTTP_INTERNAL_SERVER_ERROR = 500
const MAXIMUM_BODY_SIZE = 16_384
const MIN_MOMENT_COUNT = 3
const MAX_MOMENT_COUNT = 5
const MAX_TITLE_LENGTH = 50

const requestSchema = z
  .strictObject({
    targetDate: z.iso.date(),
    titles: z
      .array(z.string().trim().min(1).max(MAX_TITLE_LENGTH))
      .min(MIN_MOMENT_COUNT)
      .max(MAX_MOMENT_COUNT),
  })
  .superRefine((request, context) => {
    if (new Set(request.titles).size !== request.titles.length) {
      context.addIssue({code: 'custom', message: 'Titles must be unique', path: ['titles']})
    }
  })

const parseTargetDate = (isoDate: string): HistoryTargetDate => {
  const [, monthText, dayText] = isoDate.split('-')

  if (monthText === undefined || dayText === undefined) {
    throw new TypeError('Invalid target date')
  }

  const month = Number(monthText)
  const day = Number(dayText)

  return {day, isoDate, month}
}

export const POST = async (event: APIEvent): Promise<Response> => {
  if (!isAuthorizedCronRequest(event.request)) {
    return noStoreText('Unauthorized', {status: HTTP_UNAUTHORIZED})
  }

  try {
    const bodyResult = await readJsonBody(event, MAXIMUM_BODY_SIZE)

    if (!bodyResult.success) {
      return noStoreText('Invalid regeneration request', {status: bodyResult.status})
    }

    const request = requestSchema.parse(bodyResult.body)
    const result = await startHistoryRegeneration({
      requiredTitles: request.titles,
      targetDate: parseTargetDate(request.targetDate),
    })

    return noStoreJson(result, {status: ACCEPTED_STATUS})
  } catch (error) {
    if (error instanceof z.ZodError) {
      return noStoreText('Invalid regeneration request', {status: HTTP_BAD_REQUEST})
    }

    console.error('Failed to regenerate today-in-history moments', error)
    return noStoreText('Regeneration submission failed', {status: HTTP_INTERNAL_SERVER_ERROR})
  }
}
