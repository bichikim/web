/** @vitest-environment node */
import {describe, expect, it, vi} from 'vitest'

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

  it('should ignore explanatory prose after the translation JSON', () => {
    const output = `{"en":{"title":"Night","description":"Rest }"},
"ja":{"title":"夜","description":"休息"},
"zh-Hans":{"title":"夜晚","description":"休息"}}
The translation is complete; this closing brace is explanatory prose: }`

    expect(parseAlbumTranslation(output)).toEqual({
      en: {description: 'Rest }', title: 'Night'},
      ja: {description: '休息', title: '夜'},
      'zh-Hans': {description: '休息', title: '夜晚'},
    })
  })

  it('should find the translation JSON after an explanatory brace object', () => {
    const output = `Model note: {note}
{"en":{"title":"Night","description":"Rest"},
"ja":{"title":"夜","description":"休息"},
"zh-Hans":{"title":"夜晚","description":"休息"}}`

    expect(parseAlbumTranslation(output)).toEqual({
      en: {description: 'Rest', title: 'Night'},
      ja: {description: '休息', title: '夜'},
      'zh-Hans': {description: '休息', title: '夜晚'},
    })
  })

  it('should use the latest valid translation JSON when the model corrects its response', () => {
    const incorrectTranslation = {
      en: {description: 'Rest', title: 'Wrong'},
      ja: {description: '休息', title: '違う'},
      'zh-Hans': {description: '休息', title: '错误'},
    }
    const correctedTranslation = {
      en: {description: 'Rest', title: 'Right'},
      ja: {description: '休息', title: '正しい'},
      'zh-Hans': {description: '休息', title: '正确'},
    }
    const output = [incorrectTranslation, correctedTranslation]
      .map((translation) => JSON.stringify(translation))
      .join('\n')

    expect(parseAlbumTranslation(output).en.title).toBe('Right')
  })

  it('should reject incomplete model output', () => {
    expect(() => parseAlbumTranslation('{"en":{"title":"Night","description":"Rest"}}')).toThrow(
      'Gemma 4 번역 결과를 읽지 못했습니다.',
    )
  })

  it('should retain the latest valid translation before invalid trailing objects', () => {
    const translation = {
      en: {description: 'Rest', title: 'Night'},
      ja: {description: '休息', title: '夜'},
      'zh-Hans': {description: '休息', title: '夜晚'},
    }

    expect(parseAlbumTranslation(`${JSON.stringify(translation)}\n{note}\n{}`)).toEqual(translation)
  })

  it('should select the last valid nested translation in candidate order', () => {
    const first = {
      en: {description: 'Rest', title: 'Wrong'},
      ja: {description: '休息', title: '違う'},
      'zh-Hans': {description: '休息', title: '错误'},
    }
    const last = {...first, en: {description: 'Rest', title: 'Right'}}

    expect(parseAlbumTranslation(JSON.stringify({first, last}))).toEqual(last)
  })

  it('should preserve escaped text and return schema-normalized locales', () => {
    const translation = {
      en: {description: 'Quote " and slash \\ and braces { }', title: 'Night'},
      ja: {description: '休息', title: '夜'},
      'zh-Hans': {description: '休息', title: '夜晚'},
    }
    const output = JSON.stringify({
      ...translation,
      en: {...translation.en, extra: 'discarded'},
      extra: {note: 'discarded'},
    })

    expect(parseAlbumTranslation(output)).toEqual(translation)
  })

  it('should skip parsing superseded translations while checking trailing invalid objects', () => {
    const first = {
      en: {description: 'Old', title: 'Wrong-en'},
      ja: {description: 'Old', title: 'Wrong-ja'},
      'zh-Hans': {description: 'Old', title: 'Wrong-zh'},
    }
    const last = {
      en: {description: 'Rest', title: 'Night'},
      ja: {description: '休息', title: '夜'},
      'zh-Hans': {description: '休息', title: '夜晚'},
    }
    const output = `${JSON.stringify(first)}\n${JSON.stringify(last)}\n{note}\n{}`
    const parse = vi.spyOn(JSON, 'parse')
    let translations: ReturnType<typeof parseAlbumTranslation>
    let parsedInputs: Array<string>

    try {
      translations = parseAlbumTranslation(output)
      parsedInputs = parse.mock.calls.map(([input]) => input)
    } finally {
      parse.mockRestore()
    }

    expect(translations).toEqual(last)
    expect(parsedInputs).toContain(JSON.stringify(last))
    expect(parsedInputs).toContain('{note}')
    expect(parsedInputs).toContain('{}')
    expect(parsedInputs.some((input) => input.includes('Wrong-'))).toBe(false)
  })

  it.each(['plain text', '{'])('should reject non-JSON model output %j', (output) => {
    expect(() => parseAlbumTranslation(output)).toThrow('Gemma 4 번역 결과가 JSON 형식이 아닙니다.')
  })
})
