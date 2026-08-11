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
    ])
    const tokenizer = {
      all_special_ids: [0],
      decode: (tokenIds: Array<number>) => texts.get(tokenIds[0] ?? 0) ?? '',
      get_vocab: () => new Map([...texts.keys()].map((tokenId) => [String(tokenId), tokenId])),
    }

    expect(createForeignCjkTokenIds(tokenizer)).toEqual([2, 3])
  })
})

describe('replaceUnrefinedSentences', () => {
  it('should preserve clean sentences and replace unresolved contamination', () => {
    expect(replaceUnrefinedSentences('괜찮아요. 人生은 길어요.')).toBe(
      '괜찮아요. 답변의 일부 표현을 자연스러운 한국어로 바꾸지 못했어요.',
    )
  })
})
