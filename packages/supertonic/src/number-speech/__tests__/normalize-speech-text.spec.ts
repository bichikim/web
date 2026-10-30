/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '@winter-love/supertonic/number-speech/index'

describe('normalizeSpeechText', () => {
  it('should pronounce unambiguous Korean counters with the matching number system', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '사과 3개, 고양이 21마리, 오후 4시, 5분 남았고 12초 후 시작해요.',
      }),
    ).toBe('사과 세 개, 고양이 스물한 마리, 오후 네 시, 오 분 남았고 십이 초 후 시작해요.')
  })

  it('should pronounce Korean clock minutes with the hour', () => {
    expect(normalizeSpeechText({language: 'ko', text: '오후 4시 30분에 만나요.'})).toBe(
      '오후 네 시 삼십 분에 만나요.',
    )
  })

  it('should pronounce Korean colon clock ranges through the production wrapper', () => {
    expect(normalizeSpeechText({language: 'ko', text: '09:05부터 12:30까지'})).toBe(
      '아홉 시 오 분부터 열두 시 삼십 분까지',
    )
  })

  it('should preserve protected numeric ranges and structured contexts around clock times', () => {
    expect(normalizeSpeechText({language: 'ko', text: '5부터 12까지'})).toBe('5부터 12까지')
    expect(
      normalizeSpeechText({language: 'ko', text: 'https://example.com/09:05?time=12:30'}),
    ).toBe('https://example.com/09:05?time=12:30')
    expect(normalizeSpeechText({language: 'ko', text: '비율 09:05에, 버전 09:05에'})).toBe(
      '비율 09:05에, 버전 09:05에',
    )
    expect(normalizeSpeechText({language: 'ko', text: '０９:０５에, 6월 10일 09:05에'})).toBe(
      '아홉 시 오 분에, 유월 십 일 아홉 시 오 분에',
    )
  })

  it.each(['범위:5부터 12개까지', '범위：5부터 12개까지'])(
    'should preserve numeric ranges after label separators: %s',
    (text) => {
      expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
    },
  )

  it.each([
    '비율 3:5부터 12개까지',
    '비율 03:5부터 12개까지',
    '비율 03:05부터 12개까지',
    '범위 25:05부터 12:30개까지',
  ])('should preserve ranges that are not complete supported clock pairs: %s', (text) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
  })

  it('should pronounce complete fullwidth colon clock ranges', () => {
    expect(normalizeSpeechText({language: 'ko', text: '０９：05부터 12：30까지'})).toBe(
      '아홉 시 오 분부터 열두 시 삼십 분까지',
    )
  })

  it.each([
    '점수 09:05부터 12:30까지',
    '스코어는 09:05에서 12:30까지',
    '비율 09:05부터 12:30까지',
    '비율：０９：０５부터 １２：３０까지',
    '오후 13:05부터 12:30까지',
    '- 09:05부터 12:30까지',
  ])('should preserve non-clock context across colon ranges: %s', (text) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
  })

  it.each([
    ['09:05부터 12:30까지는 운영합니다.', '아홉 시 오 분부터 열두 시 삼십 분까지는 운영합니다.'],
    ['09:05부터 12:30까지도 운영합니다.', '아홉 시 오 분부터 열두 시 삼십 분까지도 운영합니다.'],
    ['０９：０５부터 １２：３０까지는', '아홉 시 오 분부터 열두 시 삼십 분까지는'],
    ['09:05부터는 12:30까지', '아홉 시 오 분부터는 열두 시 삼십 분까지'],
    ['점수 09:05부터는 12:30까지', '점수 09:05부터는 12:30까지'],
  ])('should retain clock and score contexts across compound particles: %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })

  it.each([
    'https://example.com/?time=오후 13:05에',
    'https://example.com/?time=오전 00:05에',
    'https://example.com/?time=오후 04:30에',
  ])('should retain original day-period context across protected URLs: %s', (text) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
  })

  it('should normalize an independent clock after a protected URL', () => {
    expect(normalizeSpeechText({language: 'ko', text: 'https://example.com/ 09:05에'})).toBe(
      'https://example.com/ 아홉 시 오 분에',
    )
  })

  it.each([
    'time = 09:05에',
    'time= 09:05에',
    'time = 오전 09:05에',
    'time ? 09:05에',
    'time % 09:05에',
  ])('should preserve spaced structured clock delimiters: %s', (text) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
  })

  it.each([
    '남은 시간은 09:05입니다.',
    '재생 시간은 09:05예요.',
    '경과 시간: 09:05에',
    '타임스탬프 09:05에서',
    'duration: 09:05에',
    '영상 길이는 09:05입니다.',
  ])('should preserve duration and media colon contexts: %s', (text) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
  })

  it.each(['model', 'room', '오전', '오후', 'duration', '타임스탬프'])(
    'should normalize an independent clock after a URL path cue: %s',
    (path) => {
      expect(
        normalizeSpeechText({language: 'ko', text: `https://example.com/${path} 09:05에`}),
      ).toBe(`https://example.com/${path} 아홉 시 오 분에`)
    },
  )

  it('should pronounce Korean amounts and percentages', () => {
    expect(
      normalizeSpeechText({language: 'ko', text: '가격은 12,500원이고 진행률은 12.5%예요.'}),
    ).toBe('가격은 만 이천오백 원이고 진행률은 십이 점 오 퍼센트예요.')
  })

  it('should normalize fullwidth Korean digits according to number context', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '가격은 １２３４원이고 티켓 ３장을 샀고 진행률은 １２.５%예요.',
      }),
    ).toBe('가격은 천이백삼십사 원이고 티켓 세 장을 샀고 진행률은 십이 점 오 퍼센트예요.')
    expect(normalizeSpeechText({language: 'ko', text: '００７개, ０００１원'})).toBe(
      '００７개, ０００１원',
    )
    expect(normalizeSpeechText({language: 'ko', text: '기준 연도는 ２０２６입니다.'})).toBe(
      '기준 연도는 ２０２６입니다.',
    )
  })

  it('should pronounce Korean counter and place-value boundaries', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '0개, 20개, 100개, 24시, 3월 15일, 100,000,000원',
      }),
    ).toBe('영 개, 스무 개, 백 개, 이십사 시, 삼 월 십오 일, 일억 원')
  })

  it.each([
    ['1월', '일 월'],
    ['2월', '이월'],
    ['２월', '이월'],
    ['3월', '삼 월'],
    ['4월', '사 월'],
    ['5월', '오 월'],
    ['6월', '유월'],
    ['６월', '유월'],
    ['7월', '칠 월'],
    ['8월', '팔 월'],
    ['9월', '구 월'],
    ['10월', '시월'],
    ['１０월', '시월'],
    ['11월', '십일월'],
    ['１１월', '십일월'],
    ['12월', '십이월'],
    ['１２월', '십이월'],
  ])('should pronounce %s with its Korean calendar reading', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })

  it('should read 2월 14일 as a February calendar date', () => {
    expect(normalizeSpeechText({language: 'ko', text: '2월 14일'})).toBe('이월 십사 일')
  })

  it('should preserve special and joined Korean month readings in date sentences', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '2월 14일에 만나요. 6월 10일에 만나요. 10월 3일은 개천절이에요. 11월 15일, 12월 31일.',
      }),
    ).toBe(
      '이월 십사 일에 만나요. 유월 십 일에 만나요. 시월 삼 일은 개천절이에요. 십일월 십오 일, 십이월 삼십일 일.',
    )
  })

  it('should keep irregular month readings alongside padded clock and duration readings', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '６월 １０월, ０９시 ０５분, 05분 남았어요.',
      }),
    ).toBe('유월 시월, 아홉 시 오 분, 오 분 남았어요.')
  })

  it('should not apply irregular month readings to durations and other units', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '2개월, 6개월, 10개월, 2일, 6일, 10일, 6년, 10초, 6층, 10도',
      }),
    ).toBe('이 개월, 육 개월, 십 개월, 이 일, 육 일, 십 일, 육 년, 십 초, 육 층, 10도')
  })

  it('should not apply irregular month readings to part of a larger number', () => {
    expect(
      normalizeSpeechText({
        language: 'ko',
        text: '16월, 106월, 110월, 210월, 06월, 010월, +2월, -2월, +6월, -10월, ＋６월',
      }),
    ).toBe(
      '십육 월, 백육 월, 백십 월, 이백십 월, 06월, 010월, 플러스 이 월, 마이너스 이 월, 플러스 육 월, 마이너스 십 월, 육 월',
    )
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

  it('should pronounce Unicode-minus Korean temperature and percentage values', () => {
    expect(normalizeSpeechText({language: 'ko', text: '온도는 −5도입니다.'})).toBe(
      '온도는 마이너스 오 도입니다.',
    )
    expect(normalizeSpeechText({language: 'ko', text: '−5%'})).toBe('마이너스 오 퍼센트')
  })

  it('should pronounce Unicode-minus English percentages', () => {
    expect(normalizeSpeechText({language: 'en', text: '−5%'})).toBe('minus five percent')
  })

  it('should preserve leading-zero identifiers and pronounce an explicit negative zero', () => {
    expect(normalizeSpeechText({language: 'ko', text: '007개, 0001원, -0%, −0%'})).toBe(
      '007개, 0001원, 마이너스 영 퍼센트, 마이너스 영 퍼센트',
    )
    expect(normalizeSpeechText({language: 'en', text: '007 agents, -0%, −0%'})).toBe(
      '007 agents, minus zero percent, minus zero percent',
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
  it.each([
    ['09:05부터 12:30', '아홉 시 오 분부터 열두 시 삼십 분'],
    ['09:05에서 12:30 사이', '아홉 시 오 분에서 열두 시 삼십 분 사이'],
    ['Meeting 09:05에', 'Meeting 아홉 시 오 분에'],
    ['appointment 09:05에', 'appointment 아홉 시 오 분에'],
    ['Zoom 09:05에', 'Zoom 아홉 시 오 분에'],
    ['Call 09:05에', 'Call 아홉 시 오 분에'],
    ['점수에서는 09:05에서 끝났어요.', '점수에서는 09:05에서 끝났어요.'],
    ['스코어로는 09:05입니다.', '스코어로는 09:05입니다.'],
    ['비율에서는 09:05에 해당합니다.', '비율에서는 09:05에 해당합니다.'],
    ['버전에서는 09:05에 해당합니다.', '버전에서는 09:05에 해당합니다.'],
    ['그는 “현재 시각은 09:05.”라고 말했다.', '그는 “현재 시각은 아홉 시 오 분.”라고 말했다.'],
    ['알림: (오전 09:05).', '알림: (오전 아홉 시 오 분).'],
    ['현재 시간： 09:05.', '현재 시간： 아홉 시 오 분.'],
    ['현재 시간：09:05.', '현재 시간：아홉 시 오 분.'],
    ['현재 시간：09:05부터 12:30', '현재 시간：아홉 시 오 분부터 열두 시 삼십 분'],
  ])('should retain explicit clock and non-time boundary contracts: %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })
  it.each([
    ['duration: (09:05에)', 'duration: (09:05에)'],
    ['문서 번호: (09:05에)', '문서 번호: (09:05에)'],
    ['time=(09:05에)', 'time=(09:05에)'],
    ['점수에서는 “09:05에서”', '점수에서는 “09:05에서”'],
    ['model: [09:05에]', 'model: [09:05에]'],
    ['현재 시간：(09:05).', '현재 시간：(아홉 시 오 분).'],
  ])('should retain clock context across opening delimiters: %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })

  it.each(['09:05~12:30에 운영합니다.', '09:05–12:30까지 운영합니다.'])(
    'should preserve unsupported symbolic clock ranges: %s',
    (text) => {
      expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
    },
  )
  it.each([
    ['현재 시간:09:05.', '현재 시간:아홉 시 오 분.'],
    ['현재 시간:09:05부터 12:30', '현재 시간:아홉 시 오 분부터 열두 시 삼십 분'],
    ['오후: 13:05에', '오후: 13:05에'],
    ['오전: 00:05에', '오전: 00:05에'],
    ['오후: 04:30에', '오후: 네 시 삼십 분에'],
    ['오전09:05부터 12:30까지', '오전 아홉 시 오 분부터 열두 시 삼십 분까지'],
    ['오후04:30부터 12:30까지', '오후 네 시 삼십 분부터 열두 시 삼십 분까지'],
    ['오후13:05부터 12:30까지', '오후13:05부터 12:30까지'],
    ['약속은 “09:05”에 시작합니다.', '약속은 “아홉 시 오 분”에 시작합니다.'],
    ['알람을 「09:05」로 설정해요.', '알람을 「아홉 시 오 분」으로 설정해요.'],
    ['마감은 [09:05]까지예요.', '마감은 [아홉 시 오 분]까지예요.'],
    ['최종 점수. 09:05에 시작합니다.', '최종 점수. 아홉 시 오 분에 시작합니다.'],
    ['버전. 09:05에 시작합니다.', '버전. 아홉 시 오 분에 시작합니다.'],
    ['Check the score. 09:05에 시작합니다.', 'Check the score. 아홉 시 오 분에 시작합니다.'],
    ['v. 09:05에', 'v. 09:05에'],
    ['ver. 09:05에', 'ver. 09:05에'],
    ['field:09:05에', 'field:09:05에'],
  ])('should retain clock labels and sentence boundary contracts: %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })

  it.each(['9:05에 시작합니다.', '9:05부터 12:30까지'])(
    'should preserve unsupported one-digit colon hours: %s',
    (text) => {
      expect(normalizeSpeechText({language: 'ko', text})).toBe(text)
    },
  )
  it.each([
    ['field: (09:05에)', 'field: (09:05에)'],
    ['오후 (09:05에)', '오후 (아홉 시 오 분에)'],
    ['오후 (13:05에)', '오후 (13:05에)'],
    ['time=오후 (09:05에)', 'time=오후 (09:05에)'],
    ['대화는 (09:05에)', '대화는 (아홉 시 오 분에)'],
    ['모델은 09:05입니다.', '모델은 09:05입니다.'],
    ['모델에서는 09:05를 사용합니다.', '모델에서는 09:05를 사용합니다.'],
    ['방은 09:05입니다.', '방은 09:05입니다.'],
    ['ID는 09:05입니다.', 'ID는 09:05입니다.'],
    ['model에는 09:05를 사용합니다.', 'model에는 09:05를 사용합니다.'],
    ['오후 (09:05)', '오후 (아홉 시 오 분)'],
    ['time=오후 (09:05)', 'time=오후 (09:05)'],
    ['model https://example.com/ 09:05에', 'model https://example.com/ 아홉 시 오 분에'],
    ['문서 번호 https://example.com/ 09:05에', '문서 번호 https://example.com/ 아홉 시 오 분에'],
    ['점수 https://example.com/ 09:05에', '점수 https://example.com/ 아홉 시 오 분에'],
    ['09:05부터 오후 13:30까지', '09:05부터 오후 13:30까지'],
    ['09:05부터 (25:30까지)', '09:05부터 (25:30까지)'],
    ['오전09:05부터 (오후 13:30까지)', '오전09:05부터 (오후 13:30까지)'],
    ['09:05부터 (오전 00:30까지)', '09:05부터 (오전 00:30까지)'],
    ['9:05부터 (12:30까지)', '9:05부터 (12:30까지)'],
    ['09:05부터 (오후 4:30까지)', '09:05부터 (오후 4:30까지)'],
    ['09:05부터 (오후 04:30까지)', '아홉 시 오 분부터 (오후 네 시 삼십 분까지)'],
    ['(오전09:05)부터 (오후04:30)까지', '(오전 아홉 시 오 분)부터 (오후 네 시 삼십 분)까지'],
  ])('should preserve decorated range and cue ownership contracts: %s', (text, expected) => {
    expect(normalizeSpeechText({language: 'ko', text})).toBe(expected)
  })
})
