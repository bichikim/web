import {z} from 'zod'

import {findJsonObjectEnd} from 'src/utils/json'

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
  const objectCandidates = Array.from(output.matchAll(/\{/gu), ({index}) => {
    const end = findJsonObjectEnd(output, index)
    return {end, start: index}
  })
  const translations = objectCandidates
    .filter(({end, start}) => end > start)
    .map(({end, start}) => {
      try {
        return translationOutputSchema.parse(JSON.parse(output.slice(start, end + 1)))
      } catch {
        return undefined
      }
    })
    .find((candidate) => candidate !== undefined)

  if (translations !== undefined) {
    return translations
  }

  if (!objectCandidates.some(({end, start}) => end > start)) {
    throw new Error('Gemma 4 번역 결과가 JSON 형식이 아닙니다.')
  }

  throw new Error('Gemma 4 번역 결과를 읽지 못했습니다. 다시 시도해 주세요.')
}
