import {z} from 'zod'

import type {AlbumTranslationCompleteResponse} from './messages'

const translationTextSchema = z.object({description: z.string(), title: z.string().min(1)})
export const translationOutputSchema = z.object({
  en: translationTextSchema,
  ja: translationTextSchema,
  'zh-Hans': translationTextSchema,
})

export const parseAlbumTranslation = (
  output: string,
): AlbumTranslationCompleteResponse['translations'] => {
  let parsed: unknown
  try {
    parsed = JSON.parse(output)
  } catch (error: unknown) {
    throw new Error('Gemma 4 번역 결과가 JSON 형식이 아닙니다.', {cause: error})
  }

  const result = translationOutputSchema.safeParse(parsed)
  if (!result.success) {
    throw new Error('Gemma 4 번역 결과를 읽지 못했습니다. 다시 시도해 주세요.', {
      cause: result.error,
    })
  }
  return result.data
}
