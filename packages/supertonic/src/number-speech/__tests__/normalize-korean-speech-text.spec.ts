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
    expect(normalizeKoreanSpeechText('05분 남으면 시작합니다.')).toBe('오 분 남으면 시작합니다.')
    expect(normalizeKoreanSpeechText('5분 남으면 시작합니다.')).toBe('오 분 남으면 시작합니다.')
    expect(normalizeKoreanSpeechText('０５분 남았어요.')).toBe('０５분 남았어요.')
    expect(normalizeKoreanSpeechText('05분 후에 시작합니다.')).toBe('05분 후에 시작합니다.')
    expect(normalizeKoreanSpeechText('05분 남편에게 연락했어요.')).toBe('05분 남편에게 연락했어요.')
    expect(normalizeKoreanSpeechText('5분 남편에게 연락했어요.')).toBe('5분 남편에게 연락했어요.')
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

  it('should pronounce colon clock times in Korean time contexts', () => {
    expect(normalizeKoreanSpeechText('09:05에 시작합니다.')).toBe('아홉 시 오 분에 시작합니다.')
    expect(normalizeKoreanSpeechText('12:30에 만나요.')).toBe('열두 시 삼십 분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 09:05에 만나요.')).toBe('오전 아홉 시 오 분에 만나요.')
    expect(normalizeKoreanSpeechText('오후 04:30에 만나요.')).toBe('오후 네 시 삼십 분에 만나요.')
    expect(normalizeKoreanSpeechText('오전 09:05')).toBe('오전 아홉 시 오 분')
    expect(normalizeKoreanSpeechText('０９:０５에 만나요.')).toBe('아홉 시 오 분에 만나요.')
    expect(normalizeKoreanSpeechText('00:00에, 23:59에')).toBe(
      '영 시 영 분에, 이십삼 시 오십구 분에',
    )
    expect(normalizeKoreanSpeechText('24:00에 만나요.')).toBe('이십사 시 영 분에 만나요.')
  })

  it.each(['에', '부터', '까지', '에서', '쯤', '경'])(
    'should pronounce colon clock times with the %s suffix',
    (suffix) => {
      expect(normalizeKoreanSpeechText(`09:05${suffix}`)).toBe(`아홉 시 오 분${suffix}`)
    },
  )

  it('should preserve invalid, structured, and context-free colon numbers', () => {
    const text =
      '24:01에, 12:60에, 오전 00:00에, 오전 24:00에, 오후 00:00에, 오후 13:00에, ' +
      '124:05에, 09:051에, v09:05에, 1.09:05에, ' +
      '\\09:05에, -09:05에, +09:05에, 09:05:30에, https://example.com/09:05에, https://example.com/?time=09:05에, 09:05, ' +
      '비율 09:05, 버전 09:05. 비율 09:05에, 비율: 09:05에, 버전 오전 09:05에, ' +
      'version: 오전 09:05에, aspect ratio 09:05에.'

    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it.each([
    '- 09:05에 만나요.',
    '+ 09:05에 만나요.',
    '− ０９:０５에 만나요.',
    '문서 번호 09:05에 만나요.',
    '모델 09:05에',
  ])('should preserve signed and identifier colon expressions: %s', (text) => {
    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it.each([
    ['현재 시각은 09:05입니다.', '현재 시각은 아홉 시 오 분입니다.'],
    ['09:05에는 시작해요.', '아홉 시 오 분에는 시작해요.'],
    ['09:05부터는 시작해요.', '아홉 시 오 분부터는 시작해요.'],
  ])('should pronounce colon clocks with Korean endings: %s', (text, expected) => {
    expect(normalizeKoreanSpeechText(text)).toBe(expected)
  })

  it.each([
    '경기 스코어는 09:05에서 끝났어요.',
    '최종점수는 09:05에서 끝났어요.',
    '경기스코어는 09:05에서 끝났어요.',
    '점수 09:05까지 올랐어요.',
    'score 09:05에 도달했어요.',
  ])('should preserve colon scores with explicit score cues: %s', (text) => {
    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it.each([
    ['０９：０５에 시작합니다.', '아홉 시 오 분에 시작합니다.'],
    ['현재 시각은 09:05.', '현재 시각은 아홉 시 오 분.'],
    ['시각은 09:05.', '시각은 아홉 시 오 분.'],
    ['현재 시간은 09:05.', '현재 시간은 아홉 시 오 분.'],
  ])('should pronounce explicit clock contexts and fullwidth colons: %s', (text, expected) => {
    expect(normalizeKoreanSpeechText(text)).toBe(expected)
  })

  it.each([
    ['는', '은'],
    ['가', '이'],
    ['를', '을'],
    ['와', '과'],
    ['로', '으로'],
    ['나', '이나'],
    ['예요', '이에요'],
    ['였어요', '이었어요'],
    ['라고', '이라고'],
  ])('should inflect the %s particle after the inserted minute unit', (particle, expected) => {
    expect(normalizeKoreanSpeechText(`09:05${particle}`)).toBe(`아홉 시 오 분${expected}`)
  })

  it.each(['０９：０５：３０에', '비율： ０９：０５에', '남은 시간은 09:05.'])(
    'should preserve unsupported or ambiguous clock contexts: %s',
    (text) => {
      expect(normalizeKoreanSpeechText(text)).toBe(text)
    },
  )

  it.each([
    '점수 09:05부터 12:30까지',
    '스코어는 09:05에서 12:30까지',
    '비율 09:05부터 12:30까지',
    '비율：０９：０５부터 １２：３０까지',
    '오후 13:05부터 12:30까지',
    '- 09:05부터 12:30까지',
  ])('should preserve non-clock context across colon ranges: %s', (text) => {
    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it.each(['문서 번호:', '모델:', '방:', 'ID:', 'model:', 'room：'])(
    'should preserve identifier clock values after the %s label',
    (label) => {
      const text = `${label} 09:05에 접속해요.`
      expect(normalizeKoreanSpeechText(text)).toBe(text)
    },
  )

  it.each([
    'time=오후 13:05에',
    'time=오후 04:30에',
    'time=오전 00:05에',
    'time=오후 １３：０５에',
    '문서=오전 09:05에',
  ])('should not retry a blocked day-period clock without its prefix: %s', (text) => {
    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it('should preserve score cues across compound range particles', () => {
    const text = '점수 09:05부터는 12:30까지'
    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it('should use the protected prefix only as context without including it in the output', () => {
    expect(normalizeKoreanSpeechText(' 13:05에', 'https://example.com/?time=오후')).toBe(' 13:05에')
  })

  it.each([
    'time = 09:05에',
    'time= 09:05에',
    'time = 오전 09:05에',
    'time ? 09:05에',
    'time % 09:05에',
  ])('should preserve spaced structured clock delimiters: %s', (text) => {
    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it.each([
    '남은 시간은 09:05입니다.',
    '재생 시간은 09:05예요.',
    '경과 시간: 09:05에',
    '타임스탬프 09:05에서',
    'duration: 09:05에',
    '영상 길이는 09:05입니다.',
  ])('should preserve duration and media colon contexts: %s', (text) => {
    expect(normalizeKoreanSpeechText(text)).toBe(text)
  })

  it('should retain June and October pronunciation when normalizing a colon time', () => {
    expect(normalizeKoreanSpeechText('6월 10일 09:05에 시작합니다.')).toBe(
      '유월 십 일 아홉 시 오 분에 시작합니다.',
    )
    expect(normalizeKoreanSpeechText('10월 2일 오전 09:05에 시작합니다.')).toBe(
      '시월 이 일 오전 아홉 시 오 분에 시작합니다.',
    )
  })
})
