/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '../index'

describe('normalizeSpeechText', () => {
  it('should pronounce unambiguous Korean counters with the matching number system', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '사과 3개, 고양이 21마리, 오후 4시, 5분 남았고 12초 후 시작해요.',
      }),
    ).toBe('사과 세 개, 고양이 스물한 마리, 오후 네 시, 오 분 남았고 십이 초 후 시작해요.')
  })

  it('should pronounce Korean amounts and percentages', () => {
    expect(
      normalizeSpeechText({language: 'ko', text: '가격은 12,500원이고 진행률은 12.5%예요.'}),
    ).toBe('가격은 만 이천오백 원이고 진행률은 십이 점 오 퍼센트예요.')
  })

  it('should pronounce Korean counter and place-value boundaries', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '0개, 20개, 100개, 24시, 3월 15일, 100,000,000원',
      }),
    ).toBe('영 개, 스무 개, 백 개, 이십사 시, 삼 월 십오 일, 일억 원')
  })

  it('should pronounce explicit Korean year expressions with Sino-Korean numbers', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '1000년, 2026년, 2026년도, 1990년대, 2020년생, 2025년형, 3년 동안',
      }),
    ).toBe(
      '천 년, 이천이십육 년, 이천이십육 년도, 천구백구십 년대, 이천이십 년생, 이천이십오 년형, 삼 년 동안',
    )
  })

  it('should preserve ambiguous Korean numbers and structured identifiers', () => {
    const text =
      '손님 3분, 2026, 버전 2.1.0, 전화 010-1234-5678, https://example.com/3개, 100000000000000000000 개'

    expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
  })

  it('should avoid partial Korean replacements and distinguish complete counter words', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '3개월, 5시간, 3시리즈, 3원본, 1.5개, 3-5개',
      }),
    ).toBe('삼 개월, 다섯 시간, 3시리즈, 3원본, 1.5개, 3-5개')
  })

  it('should pronounce unambiguous English counts, ordinals, and percentages', () => {
    expect(
      normalizeSpeechText({
        language: 'en',
        text: '3 apples, the 21st item, and 12.5% complete.',
      }),
    ).toBe('three apples, the twenty-first item, and twelve point five percent complete.')
  })

  it('should pronounce English cardinal place values', () => {
    expect(
      normalizeSpeechText({
        language: 'en',
        text: '0 cats, 19 birds, 20 dogs, 42 books, 100 pages, 101 lines, 1,234 words, 1,000,000 users',
      }),
    ).toBe(
      'zero cats, nineteen birds, twenty dogs, forty-two books, one hundred pages, ' +
        'one hundred one lines, one thousand two hundred thirty-four words, one million users',
    )
  })

  it('should pronounce English ordinal boundaries and signed percentages', () => {
    expect(
      normalizeSpeechText({
        language: 'en',
        text: 'the 100th page, the 101st entry, the 1,000th item, and -2%',
      }),
    ).toBe(
      'the one hundredth page, the one hundred first entry, the one thousandth item, and minus two percent',
    )
  })

  it('should pronounce common English years only in explicit year contexts', () => {
    expect(
      normalizeSpeechText({
        language: 'en',
        text:
          'in 1000, during 1066, in 1900, since 1905, the year 2000, during 2001, ' +
          'in 2010, in 1984, in 1999, in 2024, in 2026, and by 2100',
      }),
    ).toBe(
      'in one thousand, during ten sixty-six, in nineteen hundred, since nineteen oh five, ' +
        'the year two thousand, during two thousand one, in twenty ten, in nineteen eighty-four, ' +
        'in nineteen ninety-nine, in twenty twenty-four, in twenty twenty-six, and by twenty-one hundred',
    )
    expect(normalizeSpeechText({language: 'en', text: '2026 was a busy year.'})).toBe(
      'twenty twenty-six was a busy year.',
    )
    expect(normalizeSpeechText({language: 'en', text: 'September 21, 2026'})).toBe(
      'September 21, twenty twenty-six',
    )
    expect(normalizeSpeechText({language: 'en', text: 'in 2009, in 3000, and in 9999 AD'})).toBe(
      'in two thousand nine, in three thousand, and in ninety-nine ninety-nine AD',
    )
  })

  it('should preserve year-like English identifiers and unsupported year forms', () => {
    const text =
      'Room 2026, version 2026, 2026 users, 0205 was entered, 1234 is your PIN, ' +
      '4321 will be your code, release 2026, ISO 2026 standards, in 2026.5, in 2026/27'

    expect(normalizeSpeechText({language: 'en', text})).toBe(text)
    expect(normalizeSpeechText({language: 'en', text: '1234 is your PIN.'})).toBe(
      '1234 is your PIN.',
    )
    expect(normalizeSpeechText({language: 'en', text: '4321 will be your code.'})).toBe(
      '4321 will be your code.',
    )
  })

  it('should preserve ambiguous English numbers and structured identifiers', () => {
    const text =
      'Room 204, 2026, version 2.1.0, phone 010-1234-5678, https://example.com/3-items, 100000000000000000000 items'

    expect(normalizeSpeechText({language: 'en', text})).toBe(text)
  })

  it('should avoid partial or contextually ambiguous English replacements', () => {
    const text =
      '1.5 hours, 3-5 items, version 2 release, 2026 release, the 11st item, iPhone 15 Pro, GPT 5 Turbo, Route 66 west'

    expect(normalizeSpeechText({language: 'en', text})).toBe(text)
  })

  it('should retain explicit positive signs in percentages', () => {
    expect(normalizeSpeechText({language: 'ko', text: '+2%'})).toBe('플러스 이 퍼센트')
    expect(normalizeSpeechText({language: 'en', text: '+2%'})).toBe('plus two percent')
  })

  it('should preserve leading-zero identifiers and pronounce an explicit negative zero', () => {
    expect(normalizeSpeechText({language: 'ko', text: '007개, 0001원, -0%'})).toBe(
      '007개, 0001원, 마이너스 영 퍼센트',
    )
    expect(normalizeSpeechText({language: 'en', text: '007 agents, -0%'})).toBe(
      '007 agents, minus zero percent',
    )
  })

  it.each([
    ['ambiguous Korean counters', '3대, 4장, 5권'],
    ['symbol-prefixed values', '#3개, @4명, $5개, ₩6개'],
    ['punctuation ranges', '3~5개, 3–5명, 3—5시간'],
    ['Korean word ranges', '3에서 5개, 3부터 5명, 3 내지 5시간'],
    ['decimal and grouped ranges', '1.5~2.5시간, 1,000~2,000개'],
    ['comparison-prefixed values', '<3개, >4명, ≤5시간, ≥6개, ≈7개'],
    ['leading-zero years', '0001년, 0205년도, 0026년생'],
    ['structured numeric forms', 'B2B, R2-D2, GPT-5, IPv6, 1/2개, 12:30시간'],
  ])('should preserve %s', (_caseName, text) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
  })

  it.each([
    ['standards and aircraft models', 'ISO 9001 standards, Boeing 747 planes'],
    ['named series and channels', 'Formula 1 cars, Channel 4 news, Route 66 signs'],
    ['protected ordinal identifiers', 'Model 2nd generation, Room 3rd floor'],
    ['symbol-prefixed values', '#3 items, @4 users, $5 dollars, £6 pounds'],
    ['punctuation ranges', '3~5 items, 3–5 users, 3—5 hours'],
    ['English word ranges', '3 to 5 items, between 3 and 5 users, from 3 to 5 hours'],
    ['decimal and grouped ranges', '1.5 to 2.5 hours, 1,000–2,000 items'],
    ['comparison-prefixed values', '<3 items, >4 users, ≤5 hours, ≥6 books, ≈7 cats'],
    ['structured numeric forms', 'B2B, R2-D2, GPT-5, IPv6, v1.2 users, 1e3 users'],
    ['fractions and times', '1/2 items, 12:30 hours, .5%'],
  ])('should preserve %s', (_caseName, text) => {
    expect(normalizeSpeechText({language: 'en', text})).toBe(text)
  })

  it('should still pronounce clear quantities after conservative filtering', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '사과 3개가 있고 고양이 2마리와 물 4잔씩 있어요.',
      }),
    ).toBe('사과 세 개가 있고 고양이 두 마리와 물 네 잔씩 있어요.')
    expect(
      normalizeSpeechText({
        language: 'en',
        text: '3 apples, I have 4 books, there are 2 people, and (5 cats).',
      }),
    ).toBe('three apples, I have four books, there are two people, and (five cats).')
  })

  it('should pronounce quantities accepted by the tiny context model', () => {
    expect(normalizeSpeechText({language: 'ko', text: '티켓 3장을 샀고 차량 2대가 왔어요.'})).toBe(
      '티켓 세 장을 샀고 차량 두 대가 왔어요.',
    )
    expect(normalizeSpeechText({language: 'en', text: 'We shipped 3 crates.'})).toBe(
      'We shipped three crates.',
    )
    expect(normalizeSpeechText({language: 'ko', text: '택시 6대가 대기해요.'})).toBe(
      '택시 여섯 대가 대기해요.',
    )
    expect(normalizeSpeechText({language: 'en', text: 'The warehouse received 8 pallets.'})).toBe(
      'The warehouse received eight pallets.',
    )
  })

  it.each([
    ['포스터 2장을 붙였어요.', '포스터 두 장을 붙였어요.'],
    ['보고서 3권을 배포했어요.', '보고서 세 권을 배포했어요.'],
    ['프린터 4대를 점검했어요.', '프린터 네 대를 점검했어요.'],
    ['안내문 5장을 출력했어요.', '안내문 다섯 장을 출력했어요.'],
    ['화물차 6대가 도착했어요.', '화물차 여섯 대가 도착했어요.'],
    ['문제집 7권을 포장했어요.', '문제집 일곱 권을 포장했어요.'],
    ['The studio rented 2 cameras.', 'The studio rented two cameras.'],
    ['The clinic ordered 3 monitors.', 'The clinic ordered three monitors.'],
    ['The museum displayed 4 sculptures.', 'The museum displayed four sculptures.'],
    ['The bakery prepared 5 trays.', 'The bakery prepared five trays.'],
    ['The farm loaded 6 baskets.', 'The farm loaded six baskets.'],
    ['The office replaced 7 keyboards.', 'The office replaced seven keyboards.'],
  ] as const)('should transform unseen quantity vocabulary in %s', (text, expected) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(normalizeSpeechText({language, text})).toBe(expected)
  })

  it.each([
    '제3공화국을 다뤄요.',
    '3대 원칙을 설명해요.',
    '4장 구성으로 작성했어요.',
    '5권 세트라는 상품명이에요.',
    '채널 6에서 방송해요.',
    'Section 3 contains the overview.',
    'Part 4 starts here.',
    'Series 5 was discontinued.',
    'Level 6 is locked.',
    'Article 7 applies here.',
    'Amendment 8 was proposed.',
    'Apollo 11 landed successfully.',
    'Windows 11 is installed.',
  ] as const)('should preserve unseen numeric names in %s', (text) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(normalizeSpeechText({language, text})).toBe(text)
  })

  it('should preserve ambiguous counter-shaped identifiers', () => {
    expect(normalizeSpeechText({language: 'ko', text: '3대 대통령과 제3장을 설명해요.'})).toBe(
      '3대 대통령과 제3장을 설명해요.',
    )
    expect(normalizeSpeechText({language: 'ko', text: '3장에서 결론을 설명해요.'})).toBe(
      '3장에서 결론을 설명해요.',
    )
    expect(normalizeSpeechText({language: 'ko', text: '4권에서 해당 내용을 찾아요.'})).toBe(
      '4권에서 해당 내용을 찾아요.',
    )
    expect(normalizeSpeechText({language: 'en', text: 'Chapter 3 explains the result.'})).toBe(
      'Chapter 3 explains the result.',
    )
  })

  it('should pronounce explicit codes one digit at a time', () => {
    expect(
      normalizeSpeechText({language: 'ko', text: '인증번호는 4821이고 보안 코드는 7319입니다.'}),
    ).toBe('인증번호는 사 팔 이 일이고 보안 코드는 칠 삼 일 구입니다.')
    expect(
      normalizeSpeechText({language: 'en', text: 'PIN 4821 and passcode 7319 are valid.'}),
    ).toBe('PIN four eight two one and passcode seven three one nine are valid.')
  })

  it('should keep year-shaped quantities and identifiers out of digit pronunciation', () => {
    expect(normalizeSpeechText({language: 'en', text: '2026 users, Boeing 747, Room 204'})).toBe(
      '2026 users, Boeing 747, Room 204',
    )
    expect(normalizeSpeechText({language: 'ko', text: '2026명, 방 204호, 결과 42'})).toBe(
      '이천이십육 명, 방 204호, 결과 42',
    )
  })

  it('should preserve every number for languages other than Korean and English', () => {
    const text = 'りんごが3個、進捗は12.5%です。'

    expect(normalizeSpeechText({language: 'ja', text})).toBe(text)
  })

  it('should be idempotent', () => {
    const normalized = normalizeSpeechText({language: 'ko', text: '사과 3개와 진행률 12.5%'})

    expect(normalizeSpeechText({language: 'ko', text: normalized})).toBe(normalized)
  })
})
