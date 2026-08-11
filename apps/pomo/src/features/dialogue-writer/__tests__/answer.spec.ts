import {describe, expect, it} from 'vitest'

import {normalizeKoreanSpeechStyle} from '../answer'
import {trimRepetitiveTail} from '../../text-generation/answer'

describe('normalizeKoreanSpeechStyle', () => {
  it('should convert common formal endings into natural spoken honorifics', () => {
    const answer =
      '행복은 가까이에 있습니다. 작은 실천이 필요합니다. 그렇게 하면 됩니다. 좋은 선택입니다.'

    expect(normalizeKoreanSpeechStyle(answer)).toBe(
      '행복은 가까이에 있어요. 작은 실천이 필요해요. 그렇게 하면 돼요. 좋은 선택이에요.',
    )
  })

  it('should preserve formal-looking text when it is not a sentence ending', () => {
    const answer = '필요합니다라는 표현을 설명해요.'

    expect(normalizeKoreanSpeechStyle(answer)).toBe(answer)
  })

  it('should normalize common informal commands and questions', () => {
    const answer = '한번 생각해보라, 이게 좋은 방법일지? 다시 시작할까? 힘이 생길 테니까.'

    expect(normalizeKoreanSpeechStyle(answer)).toBe(
      '한번 생각해 보세요, 이게 좋은 방법일까요? 다시 시작할까요? 힘이 생길 테니까요.',
    )
  })
})

describe('trimRepetitiveTail', () => {
  it('should trim a runaway repeated phrase after preserving three occurrences', () => {
    const answer =
      '일상적인 예를 들어볼게요. 일어나는 것, 일어나는 것, 일어나는 것, 일어나는 것, 일어나는 것,'

    expect(trimRepetitiveTail(answer)).toBe(
      '일상적인 예를 들어볼게요. 일어나는 것, 일어나는 것, 일어나는 것.',
    )
  })

  it('should preserve a normal answer including non-consecutive repetition', () => {
    const answer =
      '행복은 가까이에 있어요. 행복을 찾는 과정도 중요해요. 가까이에 귀를 기울여 보세요.'

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should preserve short rhetorical emphasis', () => {
    const answer = '자, 자, 자, 자, 이제 시작해 볼까요?'

    expect(trimRepetitiveTail(answer)).toBe(answer)
  })

  it('should trim surrounding whitespace', () => {
    expect(trimRepetitiveTail('  차분히 생각해 보세요.  ')).toBe('차분히 생각해 보세요.')
  })
})
