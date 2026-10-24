import {z} from 'zod'

export const LANGUAGE_LEARNING_LANGUAGES = ['ko', 'en', 'ja'] as const
export const languageLearningLanguageSchema = z.enum(LANGUAGE_LEARNING_LANGUAGES)

export const languageLearningSentenceSchema = z.object({
  createdAt: z.iso.datetime(),
  dialogueId: z.string().min(1),
  language: languageLearningLanguageSchema,
  tags: z.array(z.string().min(1)).readonly(),
  text: z.string().min(1),
  version: z.literal(1),
})

export type LanguageLearningLanguage = z.infer<typeof languageLearningLanguageSchema>
export type LanguageLearningSentence = z.infer<typeof languageLearningSentenceSchema>
