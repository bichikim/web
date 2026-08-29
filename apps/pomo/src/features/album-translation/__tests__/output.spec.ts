import {describe, expect, it} from 'vitest'

import {parseAlbumTranslation} from '../output'

describe('parseAlbumTranslation', () => {
  it('should parse the three translated locales from a fenced model response', () => {
    const output = `\`\`\`json
{"en":{"title":"Night","description":"Rest"},
"ja":{"title":"夜","description":"休息"},
"zh-Hans":{"title":"夜晚","description":"休息"}}
\`\`\``

    expect(parseAlbumTranslation(output)).toEqual({
      en: {description: 'Rest', title: 'Night'},
      ja: {description: '休息', title: '夜'},
      'zh-Hans': {description: '休息', title: '夜晚'},
    })
  })

  it('should reject incomplete model output', () => {
    expect(() => parseAlbumTranslation('{"en":{"title":"Night","description":"Rest"}}')).toThrow(
      'Gemma 4 번역 결과를 읽지 못했습니다.',
    )
  })

  it.each(['plain text', '{'])('should reject non-JSON model output %j', (output) => {
    expect(() => parseAlbumTranslation(output)).toThrow('Gemma 4 번역 결과가 JSON 형식이 아닙니다.')
  })
})
