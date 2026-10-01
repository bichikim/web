/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechText} from '../normalize-korean-speech-text'

describe('normalizeKoreanSpeechText clock and duration expressions', () => {
  it('should pronounce zero-padded hours and minutes in Korean clock expressions', () => {
    expect(normalizeKoreanSpeechText('09시 30분에 만나요.')).toBe('아홉 시 삼십 분에 만나요.')
    expect(normalizeKoreanSpeechText('12시 05분에 만나요.')).toBe('열두 시 오 분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 09시 05분에 만나요.')).toBe(
      '오전 아홉 시 오 분에 만나요.',
    )
    expect(normalizeKoreanSpeechText('０９시 ０５분에 만나요.')).toBe('아홉 시 오 분에 만나요.')
    expect(normalizeKoreanSpeechText('09시입니다.')).toBe('아홉 시입니다.')
    expect(normalizeKoreanSpeechText('오후 4시 30분에 만나요.')).toBe(
      '오후 네 시 삼십 분에 만나요.',
    )
    expect(normalizeKoreanSpeechText('24시')).toBe('이십사 시')
    expect(normalizeKoreanSpeechText('24시 00분에 만나요.')).toBe('이십사 시 영 분에 만나요.')
  })

  it('should pronounce zero-padded remaining minutes and retain unpadded behavior', () => {
    expect(normalizeKoreanSpeechText('05분 남았어요.')).toBe('오 분 남았어요.')
    expect(normalizeKoreanSpeechText('5분 남았어요.')).toBe('오 분 남았어요.')
    expect(normalizeKoreanSpeechText('０５분 남았어요.')).toBe('０５분 남았어요.')
    expect(normalizeKoreanSpeechText('05분 후에 시작합니다.')).toBe('05분 후에 시작합니다.')
    expect(normalizeKoreanSpeechText('05분 남편에게 연락했어요.')).toBe('05분 남편에게 연락했어요.')
    expect(normalizeKoreanSpeechText('05분 남1')).toBe('05분 남1')
  })

  it('should preserve clock expressions with out-of-range or overlong values', () => {
    expect(normalizeKoreanSpeechText('24시 01분에 만나요.')).toBe('24시 01분에 만나요.')
    expect(normalizeKoreanSpeechText('24시 01분 남았어요.')).toBe('24시 01분 남았어요.')
    expect(normalizeKoreanSpeechText('09시 60분에 만나요.')).toBe('09시 60분에 만나요.')
    expect(normalizeKoreanSpeechText('09시 60분 남았어요.')).toBe('09시 60분 남았어요.')
    expect(normalizeKoreanSpeechText('25시입니다.')).toBe('25시입니다.')
    expect(normalizeKoreanSpeechText('25시 00분에 만나요.')).toBe('25시 00분에 만나요.')
    expect(normalizeKoreanSpeechText('25시 45분 남았어요.')).toBe('25시 45분 남았어요.')
    expect(normalizeKoreanSpeechText('123시 05분에 만나요.')).toBe('123시 05분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 00시 00분에 만나요.')).toBe('오전 00시 00분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 24시 00분에 만나요.')).toBe('오전 24시 00분에 만나요.')
    expect(normalizeKoreanSpeechText('오후 13시 00분에 만나요.')).toBe('오후 13시 00분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 00시입니다.')).toBe('오전 00시입니다.')
    expect(normalizeKoreanSpeechText('오전 24시입니다.')).toBe('오전 24시입니다.')
    expect(normalizeKoreanSpeechText('오후 13시입니다.')).toBe('오후 13시입니다.')
  })

  it('should preserve signs and identifier-like leading-zero values', () => {
    expect(normalizeKoreanSpeechText('-09시 05분에 만나요.')).toBe('-09시 05분에 만나요.')
    expect(normalizeKoreanSpeechText('- 09시 05분에 만나요.')).toBe('- 09시 05분에 만나요.')
    expect(normalizeKoreanSpeechText('+05분 남았어요.')).toBe('+05분 남았어요.')
    expect(normalizeKoreanSpeechText('+ 05분 남았어요.')).toBe('+ 05분 남았어요.')
    expect(normalizeKoreanSpeechText('＋０９시 ０５분에 만나요.')).toBe('＋０９시 ０５분에 만나요.')
    expect(normalizeKoreanSpeechText('− ０９시 ０５분에 만나요.')).toBe('− ０９시 ０５분에 만나요.')
    expect(normalizeKoreanSpeechText('＋０５분 남았어요.')).toBe('＋０５분 남았어요.')
    expect(normalizeKoreanSpeechText('문서 번호 09시 05분에 만나요.')).toBe(
      '문서 번호 09시 05분에 만나요.',
    )
    expect(normalizeKoreanSpeechText('버전 05분 남았어요.')).toBe('버전 05분 남았어요.')
    expect(normalizeKoreanSpeechText('009시 05분에 만나요.')).toBe('009시 05분에 만나요.')
    expect(normalizeKoreanSpeechText('005분 남았어요.')).toBe('005분 남았어요.')
  })
})
