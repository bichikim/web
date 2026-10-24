import {describe, expect, it} from 'vitest'
import {resolveViewerLanguage} from '../resolve-viewer-language'

describe('resolveViewerLanguage', () => {
  it.each([
    ['en-US', 'en'],
    ['ko_KR', 'ko'],
    [' JA-jp ', 'ja'],
    ['es-MX', 'es'],
    ['zh', 'zh-CN'],
    ['zh-CN', 'zh-CN'],
    ['zh-SG', 'zh-CN'],
    ['zh-Hans', 'zh-CN'],
    ['zh-Hans-TW', 'zh-CN'],
    ['zh-Hans-CN-x-hant', 'zh-CN'],
    ['zh-CN-x-tw', 'zh-CN'],
    ['zh-Latn-CN', 'en'],
    ['zh-Hant-CN', 'en'],
    ['zh-TW', 'en'],
    ['zh-HK', 'en'],
    ['zh-MO', 'en'],
    ['fr-FR', 'en'],
    ['', 'en'],
    [undefined, 'en'],
  ])('should resolve %s to %s', (locale, expected) => {
    expect(resolveViewerLanguage(locale)).toBe(expected)
  })
})
