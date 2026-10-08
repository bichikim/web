import {createDraftStorage, createJsonCodec} from 'src/features/value-storage'
import {z} from 'zod'

const SAJU_FORM_DRAFT_KEY = 'pomo:saju:form-draft:v1'
const FIRST_BIRTH_YEAR = 1900
const LAST_BIRTH_YEAR = 2050
const MONTHS_PER_YEAR = 12
const MAXIMUM_DAY = 31
const birthYear = z.string().refine((value) => {
  const year = Number(value)
  return (
    value === '' || (Number.isInteger(year) && year >= FIRST_BIRTH_YEAR && year <= LAST_BIRTH_YEAR)
  )
})
const birthMonth = z.string().refine((value) => {
  const month = Number(value)
  return value === '' || (Number.isInteger(month) && month >= 1 && month <= MONTHS_PER_YEAR)
})
const birthDay = z.string().refine((value) => {
  const day = Number(value)
  return value === '' || (Number.isInteger(day) && day >= 1 && day <= MAXIMUM_DAY)
})
const sajuFormDraftSchema = z.object({
  calendar: z.enum(['solar', 'lunar']),
  gender: z.enum(['M', 'F', 'N']),
  leapMonth: z.boolean(),
  lunarDay: birthDay,
  lunarMonth: birthMonth,
  lunarYear: birthYear,
  question: z.string(),
  solarDay: birthDay,
  solarMonth: birthMonth,
  solarYear: birthYear,
  time: z.union([z.literal(''), z.string().regex(/^(?:[01]\d|2[0-3]):[0-5]\d$/u)]),
  version: z.literal(1),
})

export type SajuFormDraft = z.infer<typeof sajuFormDraftSchema>

export interface SajuFormDraftPersistence {
  readonly delete: () => void
  readonly read: () => SajuFormDraft | null
  readonly write: (draft: SajuFormDraft) => void
}

const createSajuFormDraftStorage = () =>
  createDraftStorage({
    ...createJsonCodec((value): SajuFormDraft | null => {
      const result = sajuFormDraftSchema.safeParse(value)
      return result.success ? result.data : null
    }),
    key: SAJU_FORM_DRAFT_KEY,
    messages: {
      delete: 'Failed to delete the Saju form draft.',
      read: 'Failed to read the Saju form draft.',
      write: 'Failed to save the Saju form draft.',
    },
    storage: () => globalThis.localStorage,
  })

export const readSajuFormDraftFromLocalStorage = (): SajuFormDraft | null =>
  createSajuFormDraftStorage().read()

export const writeSajuFormDraftToLocalStorage = (draft: SajuFormDraft): void =>
  createSajuFormDraftStorage().write(draft)

export const deleteSajuFormDraftFromLocalStorage = (): void => createSajuFormDraftStorage().delete()
