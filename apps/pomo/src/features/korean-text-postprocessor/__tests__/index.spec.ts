/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {
  containsForeignCjk,
  createForeignCjkTokenIds,
  createKoreanRefinementMessages,
  createKoreanTextSegments,
  replaceUnrefinedSentences,
} from '../index'

describe('containsForeignCjk', () => {
  it('should detect Han and Japanese kana without flagging Korean or Latin names', () => {
    expect(containsForeignCjk('작은 성공一次次 쌓아 올려요.')).toBe(true)
    expect(containsForeignCjk('これは 테스트예요.')).toBe(true)
    expect(containsForeignCjk('Qwen과 한국어로 대화해요.')).toBe(false)
  })

  it.each(['국어·영어·수학', '「시작」', '『인용』', '1~2분 쉬어요〜'])(
    'should ignore Korean text with common CJK punctuation: %s',
    (text) => {
      expect(containsForeignCjk(text)).toBe(false)
    },
  )

  it.each(['人生', 'かな', 'カタカナ'])(
    'should continue to detect actual Han and Japanese kana: %s',
    (text) => {
      expect(containsForeignCjk(text)).toBe(true)
    },
  )
})

describe('createKoreanTextSegments', () => {
  it('should conceal only the contaminated sentence', () => {
    expect(
      createKoreanTextSegments(
        '작게 시작해 보세요. 작은 성공一次次 쌓으면 자신감이 생겨요. 내일도 이어가요.',
      ),
    ).toEqual([
      {kind: 'text', text: '작게 시작해 보세요.'},
      {kind: 'refining', text: ' 작은 성공一次次 쌓으면 자신감이 생겨요.'},
      {kind: 'text', text: ' 내일도 이어가요.'},
    ])
    expect(createKoreanTextSegments('')).toEqual([])
  })

  it.each([
    '국어·영어·수학을 공부해요.',
    '그는 「시작」이라고 말했어요.',
    '『인용』처럼 여러 기호를 써요.',
    '1~2분 쉬어요〜',
  ])('should keep Korean sentences with common CJK punctuation visible: %s', (text) => {
    expect(createKoreanTextSegments(text)).toEqual([{kind: 'text', text}])
  })

  it.each(['人生은 길어요.', 'かなを書きます.', 'カタカナを使います.'])(
    'should continue to conceal sentences with actual foreign CJK: %s',
    (text) => {
      expect(createKoreanTextSegments(text)).toEqual([{kind: 'refining', text}])
    },
  )

  it('should keep decimals and URL hostnames within their sentence', () => {
    expect(createKoreanTextSegments('3.14는 원주율입니다.')).toEqual([
      {kind: 'text', text: '3.14는 원주율입니다.'},
    ])
    expect(createKoreanTextSegments('https://example.com 에서 확인하세요.')).toEqual([
      {kind: 'text', text: 'https://example.com 에서 확인하세요.'},
    ])
    expect(createKoreanTextSegments('문장.다음 문장입니다.')).toEqual([
      {kind: 'text', text: '문장.'},
      {kind: 'text', text: '다음 문장입니다.'},
    ])
  })

  it('should keep honorific abbreviations and numbered list items within their sentences', () => {
    expect(createKoreanTextSegments('Mr. Kim은 회의에 참석했습니다.')).toEqual([
      {kind: 'text', text: 'Mr. Kim은 회의에 참석했습니다.'},
    ])
    expect(createKoreanTextSegments('Dr. Kim은 회의에 참석했습니다.')).toEqual([
      {kind: 'text', text: 'Dr. Kim은 회의에 참석했습니다.'},
    ])
    expect(createKoreanTextSegments('Mr. Smith은 人生입니다.')).toEqual([
      {kind: 'refining', text: 'Mr. Smith은 人生입니다.'},
    ])
    expect(createKoreanTextSegments('1. 첫 번째입니다. 2. 두 번째입니다.')).toEqual([
      {kind: 'text', text: '1. 첫 번째입니다.'},
      {kind: 'text', text: ' 2. 두 번째입니다.'},
    ])
  })
})

describe('createKoreanRefinementMessages', () => {
  it('should keep the original answer in a separate user message', () => {
    const messages = createKoreanRefinementMessages('원문人生')

    expect(messages.at(-1)).toEqual({content: '원문人生', role: 'user'})
    expect(messages[0]).toEqual({
      content: '의미·말투·형식을 유지해 외국 문자를 자연스러운 한국어로 바꾸고 결과만 출력하세요.',
      role: 'system',
    })
  })
})

describe('createForeignCjkTokenIds', () => {
  it('should exclude special and Korean-only tokenizer entries', () => {
    const texts = new Map([
      [0, '<special>'],
      [1, '한글'],
      [2, '人生'],
      [3, 'かな'],
      [4, 'カタカナ'],
      [5, '·'],
      [6, '「」'],
      [7, '〜'],
    ])
    const tokenizer = {
      all_special_ids: [0],
      decode: (tokenIds: Array<number>) => texts.get(tokenIds[0] ?? 0) ?? '',
      get_vocab: () => new Map([...texts.keys()].map((tokenId) => [String(tokenId), tokenId])),
    }

    expect(createForeignCjkTokenIds(tokenizer)).toEqual([2, 3, 4])
  })
})

describe('replaceUnrefinedSentences', () => {
  it('should preserve clean sentences and replace unresolved contamination', () => {
    expect(replaceUnrefinedSentences('괜찮아요. 人生은 길어요.')).toBe(
      '괜찮아요. 답변의 일부 표현을 자연스러운 한국어로 바꾸지 못했어요.',
    )
  })

  it('should preserve Korean punctuation instead of replacing the sentence with a fallback', () => {
    expect(replaceUnrefinedSentences('좋아요. 국어·영어·수학을 공부해요.')).toBe(
      '좋아요. 국어·영어·수학을 공부해요.',
    )
  })
})
