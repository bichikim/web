/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {normalizeSpeechText} from '../index'

describe('normalizeSpeechText boundary contexts', () => {
  it('should process long opening-delimiter context within the unit budget', () => {
    const prefix = '( “ [ '.repeat(334).slice(0, 2_000)
    const maximumProcessingMilliseconds = 150
    const startedAt = performance.now()
    const normalized = normalizeSpeechText({language: 'ko', text: `${prefix}09:05에`})
    const elapsed = performance.now() - startedAt

    expect(normalized).toBe(`${prefix}아홉 시 오 분에`)
    expect(elapsed).toBeLessThan(maximumProcessingMilliseconds)
  })

  it.each([
    ['현재 시각은 09:05,다음 일정입니다.', '현재 시각은 아홉 시 오 분,다음 일정입니다.'],
    ['현재 시각은 09:05，다음 일정입니다.', '현재 시각은 아홉 시 오 분，다음 일정입니다.'],
    ['현재 시각은 09:05.다음 일정입니다.', '현재 시각은 아홉 시 오 분.다음 일정입니다.'],
    ['현재 시각은 09:05．다음 일정입니다.', '현재 시각은 아홉 시 오 분．다음 일정입니다.'],
    ['현재 시각은 09:05。다음 일정입니다.', '현재 시각은 아홉 시 오 분。다음 일정입니다.'],
    ['현재 시각은 09:05!다음 일정입니다.', '현재 시각은 아홉 시 오 분!다음 일정입니다.'],
    ['현재 시각은 09:05！다음 일정입니다.', '현재 시각은 아홉 시 오 분！다음 일정입니다.'],
    ['현재 시각은 09:05?다음 일정입니다.', '현재 시각은 아홉 시 오 분?다음 일정입니다.'],
    ['현재 시각은 09:05？다음 일정입니다.', '현재 시각은 아홉 시 오 분？다음 일정입니다.'],
    ['현재 시각은 09:05…다음 일정입니다.', '현재 시각은 아홉 시 오 분…다음 일정입니다.'],
    ['현재 시각은 09:05;다음 일정입니다.', '현재 시각은 아홉 시 오 분;다음 일정입니다.'],
    ['현재 시각은 09:05；다음 일정입니다.', '현재 시각은 아홉 시 오 분；다음 일정입니다.'],
    ['현재 시각은 09:05.30', '현재 시각은 09:05.30'],
    ['현재 시각은 09:05,300', '현재 시각은 09:05,300'],
    ['현재 시각은 ０９：０５．３０', '현재 시각은 ０９：０５．３０'],
    ['현재 시각은 ０９：０５，３００', '현재 시각은 ０９：０５，３００'],
  ])('should retain clock punctuation boundaries: %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })
  it.each([
    ['문의는 user@example.id 09:05에 주세요.', '문의는 user@example.id 아홉 시 오 분에 주세요.'],
    ['model user@example.id 09:05에', 'model user@example.id 아홉 시 오 분에'],
    ['점수 user@example.version 09:05에', '점수 user@example.version 아홉 시 오 분에'],
    [
      'https://example.com/?time=오후 user@example.id 09:05에',
      'https://example.com/?time=오후 user@example.id 아홉 시 오 분에',
    ],
    [
      'user@example.id https://example.com/ 09:05에',
      'user@example.id https://example.com/ 아홉 시 오 분에',
    ],
    [
      'user@example.id https://example.com/?time=오후 13:05에',
      'user@example.id https://example.com/?time=오후 13:05에',
    ],
  ])('should retain protected address context boundaries: %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })
})
