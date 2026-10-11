import {describe, expect, it} from 'vitest'
import {translate} from '../translate'
import {english} from '../messages'

describe('translate', () => {
  it('should preserve source messages in Korean and provide English labels', () => {
    expect(translate('ko', '설정')).toBe('설정')
    expect(translate('en', '설정')).toBe('Settings')
    expect(translate('en', '미리보기 줄 수')).toBe('Preview lines')
    expect(translate('en', '사용처')).toBe('References')
  })
  it('should interpolate complete phrases without translating file names or code', () => {
    expect(translate('ko', '{line}줄 선택', {line: 12})).toBe('12줄 선택')
    expect(translate('en', '{line}줄 선택', {line: 12})).toBe('Select line 12')
    expect(translate('en', '{path} · 이름을 변경했습니다.', {path: '설정.ts'})).toBe(
      '설정.ts · Renamed.',
    )
  })
  it('should provide English copy with matching interpolation fields for every message', () => {
    for (const [source, translation] of Object.entries(english)) {
      expect(translation, source).not.toMatch(/[가-힣]/u)
      expect(translation.match(/\{\w+\}/gu)?.sort() ?? [], source).toEqual(
        source.match(/\{\w+\}/gu)?.sort() ?? [],
      )
    }
  })
})
