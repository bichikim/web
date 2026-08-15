import {z} from 'zod'

const MAX_DAY = 31
const MAX_MONTH = 12
const MIN_SUMMARY_LENGTH = 80
const MAX_SUMMARY_LENGTH = 180
const MAX_TITLE_LENGTH = 50
const MIN_BODY_LENGTH = 250
const MAX_BODY_LENGTH = 500
const MIN_MOMENT_COUNT = 3
const MAX_MOMENT_COUNT = 5

const sourceUrlSchema = z.string().url().startsWith('https://')

export const historySectionSchema = z
  .object({
    sourceUrls: z.array(sourceUrlSchema).min(2),
    text: z.string().trim().min(1),
  })
  .strict()

export const historySourceSchema = z
  .object({
    publisher: z.string().trim().min(1),
    title: z.string().trim().min(1),
    url: sourceUrlSchema,
  })
  .strict()

export const historicalMomentDraftSchema = z
  .object({
    eventDay: z.number().int().min(1).max(MAX_DAY),
    eventMonth: z.number().int().min(1).max(MAX_MONTH),
    eventYear: z.number().int().positive(),
    historicalEra: z.enum(['bce', 'ce']),
    sections: z
      .object({
        context: historySectionSchema,
        event: historySectionSchema,
        significance: historySectionSchema,
      })
      .strict(),
    sources: z.array(historySourceSchema).min(2),
    summary: z.string().trim().min(MIN_SUMMARY_LENGTH).max(MAX_SUMMARY_LENGTH),
    title: z.string().trim().min(1).max(MAX_TITLE_LENGTH),
  })
  .strict()
  .superRefine((moment, context) => {
    const bodyLength = Object.values(moment.sections).reduce(
      (length, section) => length + section.text.length,
      0,
    )

    if (bodyLength < MIN_BODY_LENGTH || bodyLength > MAX_BODY_LENGTH) {
      context.addIssue({
        code: 'custom',
        message: 'The combined section length must be between 250 and 500 characters',
        path: ['sections'],
      })
    }
  })

export const historyGenerationOutputSchema = z
  .object({
    moments: z.array(historicalMomentDraftSchema).min(MIN_MOMENT_COUNT).max(MAX_MOMENT_COUNT),
  })
  .strict()

export type HistoricalMomentDraft = z.infer<typeof historicalMomentDraftSchema>
export type HistoryGenerationOutput = z.infer<typeof historyGenerationOutputSchema>

export interface HistorySourcePolicy {
  readonly allowedDomains: ReadonlyArray<string>
  readonly seedUrls: ReadonlyArray<string>
  readonly version: string
}

export interface HistoryTargetDate {
  readonly day: number
  readonly isoDate: string
  readonly month: number
}
