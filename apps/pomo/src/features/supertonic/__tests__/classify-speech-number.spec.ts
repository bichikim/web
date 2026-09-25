/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {classifySpeechNumber} from '../index'

const classify = (language: 'en' | 'ko', text: string, value: string) => {
  const start = text.indexOf(value)

  return classifySpeechNumber({
    end: start + value.length,
    language,
    start,
    text,
  })
}

describe('classifySpeechNumber', () => {
  it.each([
    ['사과 3개', '3', 'count'],
    ['고양이 21마리', '21', 'count'],
    ['2026년', '2026', 'year-date-time'],
    ['2026년도', '2026', 'year-date-time'],
    ['오후 4시', '4', 'year-date-time'],
    ['가격은 12,500원', '12,500', 'cardinal'],
    ['5분 동안', '5', 'cardinal'],
  ] as const)('should classify Korean pronunciation roles in %s', (text, value, kind) => {
    expect(classify('ko', text, value)).toMatchObject({kind})
  })

  it.each([
    ['3 apples', '3', 'count'],
    ['I have 4 books', '4', 'count'],
    ['in 2026', '2026', 'year-date-time'],
    ['The archive opened in 1980.', '1980', 'year-date-time'],
    ['2026 was a busy year', '2026', 'year-date-time'],
    ['September 21, 2026', '2026', 'year-date-time'],
    ['the 21st item', '21st', 'ordinal'],
    ['12.5%', '12.5', 'cardinal'],
  ] as const)('should classify English pronunciation roles in %s', (text, value, kind) => {
    expect(classify('en', text, value)).toMatchObject({kind})
  })

  it.each([
    ['티켓 3장을 샀어요', '3', 'count'],
    ['차량 2대가 도착했어요', '2', 'count'],
    ['책 4권을 주문했어요', '4', 'count'],
    ['온도는 23도예요', '23', 'cardinal'],
    ['인증번호는 4821입니다', '4821', 'digits'],
    ['We shipped 3 crates', '3', 'count'],
    ['She adopted 2 puppies', '2', 'count'],
    ['The temperature is 23 degrees', '23', 'cardinal'],
    ['PIN 4821 is valid', '4821', 'digits'],
  ] as const)('should use the tiny model for ambiguous context in %s', (text, value, kind) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(classify(language, text, value)).toMatchObject({kind})
  })

  it.each([
    ['쿠폰 7장을 받았어요', '7', 'count'],
    ['버스 3대가 멈췄어요', '3', 'count'],
    ['잡지 8권을 빌렸어요', '8', 'count'],
    ['전단 6장을 나눠줬어요', '6', 'count'],
    ['승용차 4대가 주차됐어요', '4', 'count'],
    ['백과사전 12권을 정리했어요', '12', 'count'],
    ['보안 코드는 7319입니다', '7319', 'digits'],
    ['Workers loaded 6 containers', '6', 'count'],
    ['I ordered 5 notebooks', '5', 'count'],
    ['The courier carried 9 parcels', '9', 'count'],
    ['We printed 6 flyers', '6', 'count'],
    ['Use PIN 7319 to continue', '7319', 'digits'],
    ['Route 66 is famous', '66', 'identifier'],
    ['Boeing 787 aircraft', '787', 'identifier'],
    ['회의 자료 5장을 복사했어요', '5', 'count'],
    ['택시 6대가 대기해요', '6', 'count'],
    ['The warehouse received 8 pallets', '8', 'count'],
    ['A volunteer collected 7 blankets', '7', 'count'],
  ] as const)('should generalize model roles to held-out wording in %s', (text, value, kind) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(classify(language, text, value)).toMatchObject({kind})
  })

  it.each([
    ['숫자 42가 보였어요', '42'],
    ['결과 42가 표시됐어요', '42'],
    ['3대, 4장, 5권', '3'],
    ['Result 42 appeared', '42'],
    ['A value of 42 appeared', '42'],
  ] as const)('should abstain from uncertain model contexts in %s', (text, value) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(classify(language, text, value)).toMatchObject({kind: 'preserve'})
  })

  it.each([
    ['3대 대통령을 소개해요', '3', 'identifier'],
    ['제3장에서는 결론을 설명해요', '3', 'preserve'],
    ['Chapter 3 explains the result', '3', 'identifier'],
  ] as const)('should preserve protected numeric names in %s', (text, value, kind) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(classify(language, text, value)).toMatchObject({kind})
  })

  it.each([
    ['Room 204', '204', 'identifier'],
    ['ISO 9001 standards', '9001', 'identifier'],
    ['version 2 release', '2', 'identifier'],
    ['007 agents', '007', 'digits'],
    ['010-1234-5678', '010', 'digits'],
    ['3-5 items', '3', 'preserve'],
    ['1.5 hours', '1.5', 'preserve'],
    ['the 11st item', '11st', 'preserve'],
    ['2026 users', '2026', 'preserve'],
    ['Boeing 747 planes', '747', 'identifier'],
  ] as const)(
    'should avoid treating English identifiers as quantities in %s',
    (text, value, kind) => {
      expect(classify('en', text, value)).toMatchObject({kind})
    },
  )

  it.each([
    ['손님 3분', '3', 'preserve'],
    ['방 204호', '204', 'identifier'],
    ['버전 2 출시', '2', 'identifier'],
    ['007개', '007', 'digits'],
    ['010-1234-5678', '010', 'digits'],
    ['3~5개', '3', 'preserve'],
    ['1.5개', '1.5', 'preserve'],
  ] as const)(
    'should avoid treating Korean identifiers as quantities in %s',
    (text, value, kind) => {
      expect(classify('ko', text, value)).toMatchObject({kind})
    },
  )

  it('should expose deterministic confidence and preserve invalid spans', () => {
    expect(classify('ko', '사과 3개', '3')).toEqual({confidence: 0.99, kind: 'count'})
    expect(classify('en', '1.5 hours', '1.5')).toEqual({confidence: 0.5, kind: 'preserve'})
    expect(classifySpeechNumber({end: 2, language: 'en', start: 4, text: '3 apples'})).toEqual({
      confidence: 1,
      kind: 'preserve',
    })
    expect(classifySpeechNumber({end: 1, language: 'ja', start: 0, text: '3個'})).toEqual({
      confidence: 1,
      kind: 'preserve',
    })
  })
})
