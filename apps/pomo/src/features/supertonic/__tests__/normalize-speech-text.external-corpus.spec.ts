/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '../index'

// Categories are adapted into original sentences from the Apache-2.0 NeMo TN suites and
// Google Text Normalization Challenge rather than copying their corpus entries.
const SUPPORTED_CASES = [
  ['en', 'I packed 23 items.', 'I packed twenty-three items.'],
  ['en', 'She finished the 42nd entry.', 'She finished the forty-second entry.'],
  ['en', 'The archive opened in 1980.', 'The archive opened in nineteen eighty.'],
  ['en', 'March 5, 2025 was the deadline.', 'March 5, twenty twenty-five was the deadline.'],
  ['en', 'Progress reached 3.14%.', 'Progress reached three point one four percent.'],
  ['en', 'Verification code 4062 is ready.', 'Verification code four zero six two is ready.'],
  ['en', 'Verification code 004 is ready.', 'Verification code zero zero four is ready.'],
  ['ko', '사진 12장을 정리했어요.', '사진 열두 장을 정리했어요.'],
  ['ko', '노래 13곡을 재생했어요.', '노래 열세 곡을 재생했어요.'],
  ['ko', '레벨 4에 도착했어요.', '레벨 사에 도착했어요.'],
  ['ko', '레벨 50을 달성했어요.', '레벨 오십을 달성했어요.'],
  ['ko', '64렙을 달성했어요.', '육십사 렙을 달성했어요.'],
  ['ko', '2024년 3월 5일에 시작했어요.', '이천이십사 년 삼 월 오 일에 시작했어요.'],
  ['ko', '진행률은 3.14%예요.', '진행률은 삼 점 일 사 퍼센트예요.'],
  ['ko', '인증 코드 4062를 입력해요.', '인증 코드 사 영 육 이를 입력해요.'],
] as const

const CONSERVATIVE_CASES = [
  ['en', 'The total is $5.50.'],
  ['en', 'The limit is 200 km/h.'],
  ['en', 'The meeting starts at 2:30 PM.'],
  ['en', 'Music from the 1980s is playing.'],
  ['en', 'Send it to test123@example.com.'],
  ['en', 'Visit https://example.com/v2.'],
  ['en', 'Call 123-456-7890 tomorrow.'],
  ['en', 'The server is at 192.168.0.1.'],
  ['en', 'Use build 12/16/2018 for comparison.'],
  ['en', 'The reference is 13000.'],
  ['en', 'The impossible date is 1998/2/30.'],
  ['ko', '전화번호는 010-1234-5678이에요.'],
  ['ko', '회의는 오후 2:30에 시작해요.'],
  ['ko', '서버 주소는 192.168.0.1이에요.'],
  ['ko', '버전 2.1.0을 설치했어요.'],
  ['ko', '레벨 004에 도착했어요.'],
  ['ko', '레벨 4.2에 도착했어요.'],
  ['ko', '레벨 4-2에 도착했어요.'],
  ['ko', '64렙업을 달성했어요.'],
] as const

describe('normalizeSpeechText external corpus categories', () => {
  it.each(SUPPORTED_CASES)(
    'should normalize an externally derived supported case in %s: %s',
    (language, text, expected) => {
      expect(normalizeSpeechText({language, text})).toBe(expected)
    },
  )

  it.each(CONSERVATIVE_CASES)(
    'should preserve an externally derived unsupported case in %s: %s',
    (language, text) => {
      expect(normalizeSpeechText({language, text})).toBe(text)
    },
  )
})
