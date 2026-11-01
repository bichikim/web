/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {parseAlbumTranslation} from '../output'

const translation = {
  en: {description: 'Quote " and slash \\ and braces { }', title: 'Night'},
  ja: {description: '休息', title: '夜'},
  'zh-Hans': {description: '休息', title: '夜晚'},
}
const json = JSON.stringify(translation)

describe('parseAlbumTranslation', () => {
  it('should parse one complete response and preserve escaped text and surrounding whitespace', () => {
    expect(parseAlbumTranslation(` \n${json}\n `)).toEqual(translation)
  })

  it('should retain schema normalization for unknown fields', () => {
    expect(
      parseAlbumTranslation(
        JSON.stringify({
          ...translation,
          en: {...translation.en, extra: 'discarded'},
          extra: {note: 'discarded'},
        }),
      ),
    ).toEqual(translation)
  })

  it.each([
    'plain text',
    '{',
    `\`\`\`json\n${json}\n\`\`\``,
    `Model note: {note}\n${json}`,
    `${json}\nDone.`,
    `${json}\n${json}`,
    `{incomplete ${json}`,
  ])('should reject an incomplete or mixed JSON response %j', (output) => {
    expect(() => parseAlbumTranslation(output)).toThrow('Gemma 4 번역 결과가 JSON 형식이 아닙니다.')
  })

  it.each(
    [
      null,
      [],
      true,
      {},
      {en: translation.en},
      {...translation, en: {description: 'Rest', title: ''}},
      {example: translation},
    ].map((value) => ({value})),
  )('should reject a complete JSON value with an invalid translation shape %j', ({value}) => {
    expect(() => parseAlbumTranslation(JSON.stringify(value))).toThrow(
      'Gemma 4 번역 결과를 읽지 못했습니다.',
    )
  })
})
