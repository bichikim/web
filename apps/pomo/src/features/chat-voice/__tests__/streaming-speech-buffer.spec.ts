/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createStreamingSpeechBuffer} from '../streaming-speech-buffer'

describe('createStreamingSpeechBuffer', () => {
  it('should emit each completed sentence once while retaining the unfinished tail', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('첫 문장입니다. 다음')).toEqual(['첫 문장입니다.'])
    expect(buffer.update('첫 문장입니다. 다음 문장이 이어집니다. 마지막')).toEqual([
      '다음 문장이 이어집니다.',
    ])
    expect(buffer.update('첫 문장입니다. 다음 문장이 이어집니다. 마지막')).toEqual([])
    expect(buffer.flush('첫 문장입니다. 다음 문장이 이어집니다. 마지막')).toBe('마지막')
  })

  it.each([
    ['Dr.', 'Please ask', 'Smith', 'to call.'],
    ['“Dr.”', 'Please ask', 'Smith', 'to call.'],
    ['Prof.', 'Please ask', 'Smith', 'to call.'],
    ['e.g.', 'Examples include', 'Apples', 'and pears.'],
    ['U.S.', 'This is', 'Army', 'work.'],
    ['vs.', 'Category A', 'Category', 'B.'],
  ] as const)(
    'should keep abbreviation %s with its sentence until completion',
    (abbreviation, lead, nextWord, ending) => {
      const buffer = createStreamingSpeechBuffer({locale: 'ko'})
      const abbreviationText = `${lead} ${abbreviation}`
      const partialText = `${abbreviationText} ${nextWord}`
      const completedSentence = `${partialText} ${ending}`

      expect(buffer.update(abbreviationText)).toEqual([])
      expect(buffer.update(partialText)).toEqual([])
      expect(buffer.update(`${completedSentence} Continue`)).toEqual([completedSentence])
      expect(buffer.update(`${completedSentence} Continue waiting.`)).toEqual(['Continue waiting.'])
    },
  )

  it.each([
    ['Choose category B. Next', 'Choose category B.'],
    ['Pick option A. Continue', 'Pick option A.'],
  ] as const)(
    'should emit a completed sentence ending with a single-letter label (%s)',
    (text, expectedSentence) => {
      const buffer = createStreamingSpeechBuffer({locale: 'ko'})

      expect(buffer.update(text)).toEqual([expectedSentence])
    },
  )

  it('should keep sentence-leading initials attached to the following name', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('J.')).toEqual([])
    expect(buffer.update('J. R.')).toEqual([])
    expect(buffer.update('J. R. R. Tolkien arrived. Next')).toEqual(['J. R. R. Tolkien arrived.'])
  })

  it('should keep an embedded initial attached to the following name', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('Please contact J.')).toEqual([])
    expect(buffer.update('Please contact J. Smith')).toEqual([])
    expect(buffer.update('Please contact J. Smith today. Next')).toEqual([
      'Please contact J. Smith today.',
    ])
  })

  it('should treat a completed line as a speech boundary and reset for the next answer', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('첫 번째 항목\n두 번째')).toEqual(['첫 번째 항목'])
    buffer.reset()
    expect(buffer.update('새 답변입니다.')).toEqual(['새 답변입니다.'])
  })

  it('should recover from shorter replacement text and reject a stale flush', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('기존 답변입니다.')).toEqual(['기존 답변입니다.'])
    expect(buffer.update('새 답변입니다.')).toEqual(['새 답변입니다.'])
    expect(buffer.flush('짧음')).toBeNull()
  })

  it('should not repeat a completed sentence when the stream shrinks to it', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('첫 문장입니다. 두 번째')).toEqual(['첫 문장입니다.'])
    expect(buffer.update('첫 문장입니다.')).toEqual([])
  })

  it.each([
    ['en', 'Hello world.', 'Hello world!'],
    ['ko', 'Hello world.”', 'Hello world!”'],
  ] as const)(
    'should keep a consumed sentence from being reemitted after a terminal punctuation change (%s: %s → %s)',
    (locale, originalText, revisedText) => {
      const buffer = createStreamingSpeechBuffer({locale})

      expect(buffer.update(originalText)).toEqual([originalText])
      expect(buffer.update(revisedText)).toEqual([])
      expect(buffer.update(`${revisedText} Next sentence.`)).toEqual(['Next sentence.'])
    },
  )

  it('should not repeat an earlier completed sentence when a later sentence changes', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('첫 문장입니다. 둘째 문장입니다.')).toEqual([
      '첫 문장입니다.',
      '둘째 문장입니다.',
    ])
    const correctedText = '첫 문장입니다. 수정된 둘째 문장입니다!'

    expect(buffer.update(correctedText)).toEqual(['수정된 둘째 문장입니다!'])
    expect(buffer.update(correctedText)).toEqual([])
    expect(buffer.update(`${correctedText} 세 번째 문장입니다.`)).toEqual(['세 번째 문장입니다.'])
  })

  it('should omit an empty completed segment and an empty remaining tail', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('\n')).toEqual([])
    expect(buffer.flush('\n')).toBeNull()
  })
})
