import {z} from 'zod'

import {languageLearningLanguageSchema} from './schema'

export const languageLearningWordSchema = z.object({
  createdAt: z.iso.datetime(),
  language: languageLearningLanguageSchema,
  memorized: z.boolean().default(false),
  value: z.string().min(1),
  version: z.literal(1),
})

export type LanguageLearningWord = z.infer<typeof languageLearningWordSchema>
