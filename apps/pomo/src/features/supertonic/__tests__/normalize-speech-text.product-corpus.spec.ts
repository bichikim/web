/** @vitest-environment node */
import {readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'
import {z} from 'zod'

import {normalizeSpeechText} from '../index'

const narrationSchema = z.object({
  clips: z.array(z.object({id: z.string(), text: z.string()})),
})
const readNarration = (path: string) =>
  narrationSchema.parse(JSON.parse(readFileSync(new URL(path, import.meta.url), 'utf8')))
const koreanNarration = readNarration('../../../../asset-library/tour/narration/ko.json')
const englishNarration = readNarration('../../../../asset-library/tour/narration/en.json')
const NARRATION_CASES = [
  ...koreanNarration.clips.map(({id, text}) => ({id, language: 'ko' as const, text})),
  ...englishNarration.clips.map(({id, text}) => ({id, language: 'en' as const, text})),
]

describe('normalizeSpeechText product corpus', () => {
  it.each(NARRATION_CASES)(
    'should preserve the authored $language tour narration for $id',
    ({language, text}) => {
      expect(normalizeSpeechText({language, text})).toBe(text)
    },
  )
})
