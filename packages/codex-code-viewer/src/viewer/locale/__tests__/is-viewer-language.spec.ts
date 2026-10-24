import {describe, expect, it} from 'vitest'
import {isViewerLanguage} from '../is-viewer-language'

describe('isViewerLanguage', () => {
  it.each(['ko', 'en', 'ja', 'zh-CN', 'es'])('should accept the stored language %s', (value) => {
    expect(isViewerLanguage(value)).toBe(true)
  })
  it.each(['auto', 'ja-JP', 'zh-TW', 'fr', 'EN', ' en ', '', null, undefined, 1, {}])(
    'should reject a noncanonical stored language %s',
    (value) => {
      expect(isViewerLanguage(value)).toBe(false)
    },
  )
})
