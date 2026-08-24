import {z} from 'zod'

import type {AlbumTranslationCompleteResponse} from './messages'

const translationTextSchema = z.object({description: z.string(), title: z.string().min(1)})
const translationOutputSchema = z.object({
  en: translationTextSchema,
  ja: translationTextSchema,
  'zh-Hans': translationTextSchema,
})

export const parseAlbumTranslation = (
  output: string,
): AlbumTranslationCompleteResponse['translations'] => {
  const firstBrace = output.indexOf('{')
  const lastBrace = output.lastIndexOf('}')

  if (firstBrace < 0 || lastBrace <= firstBrace) {
    throw new Error('Gemma 4 번역 결과가 JSON 형식이 아닙니다.')
  }

  try {
    return translationOutputSchema.parse(JSON.parse(output.slice(firstBrace, lastBrace + 1)))
  } catch (error) {
    throw new Error('Gemma 4 번역 결과를 읽지 못했습니다. 다시 시도해 주세요.', {cause: error})
  }
}
