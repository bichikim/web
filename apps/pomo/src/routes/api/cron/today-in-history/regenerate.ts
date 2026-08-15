import type {APIEvent} from '@solidjs/start/server'
import {z} from 'zod'

import type {HistoryTargetDate} from 'src/features/history-generation'
import {isAuthorizedCronRequest} from 'src/server/cron/environment'
import {startHistoryRegeneration} from 'src/server/history-generation/start-regeneration'

const ACCEPTED_STATUS = 202
const MIN_MOMENT_COUNT = 3
const MAX_MOMENT_COUNT = 5
const MAX_TITLE_LENGTH = 50

const requestSchema = z
  .object({
    targetDate: z.iso.date(),
    titles: z
      .array(z.string().trim().min(1).max(MAX_TITLE_LENGTH))
      .min(MIN_MOMENT_COUNT)
      .max(MAX_MOMENT_COUNT),
  })
  .strict()
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
    return new Response('Unauthorized', {status: 401})
  }

  try {
    const request = requestSchema.parse(await event.request.json())
    const result = await startHistoryRegeneration({
      requiredTitles: request.titles,
      targetDate: parseTargetDate(request.targetDate),
    })

    return Response.json(result, {status: ACCEPTED_STATUS})
  } catch (error) {
    if (error instanceof z.ZodError || error instanceof SyntaxError) {
      return new Response('Invalid regeneration request', {status: 400})
    }

    console.error('Failed to regenerate today-in-history moments', error)
    return new Response('Regeneration submission failed', {status: 500})
  }
}
