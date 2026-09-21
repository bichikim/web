/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {normalizeSpeechText} from '../index'

describe('normalizeSpeechText holdout contexts', () => {
  it.each([
    ['관제소가 드론 3대를 배치했어요.', '관제소가 드론 세 대를 배치했어요.'],
    ['출판사가 화보집 4권을 발송했어요.', '출판사가 화보집 네 권을 발송했어요.'],
    ['공방이 도안 5장을 보관했어요.', '공방이 도안 다섯 장을 보관했어요.'],
    ['심사위원이 작품 6점을 선정했어요.', '심사위원이 작품 여섯 점을 선정했어요.'],
    ['The observatory deployed 3 telescopes.', 'The observatory deployed three telescopes.'],
    ['The restaurant arranged 4 tables.', 'The restaurant arranged four tables.'],
    ['The publisher shipped 5 atlases.', 'The publisher shipped five atlases.'],
    ['The factory assembled 6 drones.', 'The factory assembled six drones.'],
  ] as const)('should pronounce a held-out quantity context in %s', (text, expected) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(normalizeSpeechText({language, text})).toBe(expected)
  })

  it.each([
    '제12항을 참고해요.',
    '노드 18에서 실행해요.',
    '포트 443을 열었어요.',
    '스튜디오 21이라는 이름이에요.',
    'Canvas 2 is enabled.',
    'Node 18 restarted.',
    'Port 443 is open.',
    'Warehouse 13 is a title.',
  ] as const)('should preserve a held-out identifier context in %s', (text) => {
    const language = /[가-힣]/u.test(text) ? 'ko' : 'en'

    expect(normalizeSpeechText({language, text})).toBe(text)
  })

  it.each([
    ['ko', '그 값이 73이라는 사실만 알아요.'],
    ['ko', '메모에는 64만 있었어요.'],
    ['en', 'The note contained only 73.'],
    ['en', 'A bare 64 appeared in the log.'],
  ] as const)('should preserve a held-out unlabeled value in %s: %s', (language, text) => {
    expect(normalizeSpeechText({language, text})).toBe(text)
  })
})
