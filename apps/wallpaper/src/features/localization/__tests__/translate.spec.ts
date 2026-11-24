import {describe, expect, it} from 'vitest'
import korean from '../../../../.i18n/messages/ko.json'
import english from '../../../../.i18n/messages/en.json'
import {translate, translateKnown} from '../translate'

describe('translate', () => {
  it('should select Korean and English from matching catalogs', () => {
    expect(Object.keys(english).sort()).toEqual(Object.keys(korean).sort())
    expect(translate('ko', '열린 위젯')).toBe('열린 위젯')
    expect(translate('en', '열린 위젯')).toBe('Open widgets')
  })

  it('should interpolate values without interpreting their contents', () => {
    expect(translate('en', '{value0} · 위젯 {value1}', {value0: '애시 {value1}', value1: 2})).toBe(
      '애시 {value1} · Widget 2',
    )
  })

  it('should localize known system messages and preserve unrecognized content', () => {
    expect(translateKnown('en', 'Codex가 작업하고 있어요.')).toBe('Codex is working.')
    expect(translateKnown('en', '내가 입력한 대화')).toBe('내가 입력한 대화')
  })

  it('should translate formatted progress in either direction while preserving its value', () => {
    expect(translateKnown('en', '모델 다운로드 중 · 42%')).toBe('Downloading model · 42%')
    expect(translateKnown('ko', 'Downloading model · 42%')).toBe('모델 다운로드 중 · 42%')
  })

  it('should keep the same interpolation placeholders in both languages', () => {
    for (const key of Object.keys(korean)) {
      const message = key as keyof typeof korean
      const placeholders = (value: string) =>
        [...value.matchAll(/\{(?<key>\w+)\}/gu)].map(([key]) => key).sort()
      expect(placeholders(english[message]), message).toEqual(placeholders(korean[message]))
    }
  })

  it('should contain no untranslated Korean in the English interface catalog', () => {
    expect(Object.entries(english).filter(([, value]) => /[가-힣]/u.test(value))).toEqual([])
  })
})
