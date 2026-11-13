/** @vitest-environment node */
import {describe, expect, it} from 'vitest'

import {createStreamingSpeechBuffer} from '../streaming-speech-buffer'

const speakStreamed = (text: string, chunkSize: number) => {
  const buffer = createStreamingSpeechBuffer({locale: 'ko'})
  const characters = Array.from(text)
  const spoken: string[] = []

  for (let end = chunkSize; end < characters.length + chunkSize; end += chunkSize) {
    spoken.push(...buffer.update(characters.slice(0, Math.min(end, characters.length)).join('')))
  }

  const remainder = buffer.flush(text)
  return remainder === null ? spoken : [...spoken, remainder]
}

const withoutWhitespace = (text: string) => text.replace(/\s+/gu, '')

describe('createStreamingSpeechBuffer', () => {
  it.each([
    '좋아요‼ 그렇죠.',
    '좋아요⁉ 그렇죠.',
    '그는 「안녕.」이라고 했다.',
    '결과입니다.） 다음 문장이에요.',
    '결과입니다.» 다음 문장이에요.',
  ])(
    'should conserve every non-whitespace character for whole-text and character chunks: %s',
    (text) => {
      const characterCount = Array.from(text).length
      const expected = withoutWhitespace(text)
      const spokenByChunkSize = [characterCount, 1].map((chunkSize) =>
        withoutWhitespace(speakStreamed(text, chunkSize).join('')),
      )

      expect(spokenByChunkSize).toEqual([expected, expected])
    },
  )

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
    ['원주율은 3.14입니다. 다음 문장이에요.', ['원주율은 3.14입니다.', '다음 문장이에요.']],
    [
      'Python 3.12 버전을 설치하세요. 다음 문장이에요.',
      ['Python 3.12 버전을 설치하세요.', '다음 문장이에요.'],
    ],
    [
      'Use version 3.12.4 before continuing. Next step.',
      ['Use version 3.12.4 before continuing.', 'Next step.'],
    ],
  ] as const)(
    'should preserve decimal and version sentences across real streaming prefixes: %s',
    (text, expectedSegments) => {
      expect(speakStreamed(text, 1)).toEqual(expectedSegments)
    },
  )

  it('should hold a numeric period for possible decimal digits without delaying earlier sentences', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})
    const prefix = '이전 문장은 끝났어요. 원주율은 3'
    const completedText = `${prefix}.14입니다. 다음 문장이에요.`

    expect(buffer.update(prefix)).toEqual(['이전 문장은 끝났어요.'])
    expect(buffer.update(`${prefix}.`)).toEqual([])
    expect(buffer.update(completedText)).toEqual(['원주율은 3.14입니다.', '다음 문장이에요.'])
    expect(buffer.flush(completedText)).toBeNull()
  })

  it('should emit a numeric sentence when a following sentence disambiguates its period', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('There are 3.')).toEqual([])
    expect(buffer.update('There are 3. Next sentence.')).toEqual(['There are 3.', 'Next sentence.'])
  })

  it('should flush a genuine sentence ending after a numeric value exactly once', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})
    const finalText = 'There are 3.'

    expect(buffer.update(finalText)).toEqual([])
    expect(buffer.flush(finalText)).toBe(finalText)
    expect(buffer.update(finalText)).toEqual([])
  })

  it('should not flush a numeric sentence already consumed before a shorter replacement', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('There are 3. Original ending.')).toEqual([
      'There are 3.',
      'Original ending.',
    ])
    expect(buffer.update('There are 3.')).toEqual([])
    expect(buffer.flush('There are 3.')).toBeNull()
  })

  it('should not repeat a consumed numeric sentence when a later separator changes to a newline', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('There are 3. Original ending.')).toEqual([
      'There are 3.',
      'Original ending.',
    ])
    expect(buffer.update('There are 3.\nRevised ending.')).toEqual(['Revised ending.'])
    expect(buffer.update('There are 3. Corrected ending.')).toEqual(['Corrected ending.'])
  })

  it('should re-evaluate a consumed numeric period when later text extends it into a decimal', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('There are 3. Original ending.')).toEqual([
      'There are 3.',
      'Original ending.',
    ])
    expect(buffer.update('There are 3.\n')).toEqual([])

    const updatedText = 'There are 3.14 units.'

    for (let end = 1; end <= updatedText.length; end += 1) {
      const emittedSegments = buffer.update(updatedText.slice(0, end))

      expect(emittedSegments).toEqual(end < updatedText.length ? [] : [updatedText])
    }

    expect(buffer.flush(updatedText)).toBeNull()
  })

  it('should preserve a numeric sentence consumed by flush when later text changes its separator', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('There are 3.')).toEqual([])
    expect(buffer.flush('There are 3.')).toBe('There are 3.')
    expect(buffer.update('There are 3.\nRevised ending.')).toEqual(['Revised ending.'])
  })

  it('should speak a revised decimal sentence when replacement text adds fractional digits', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('There are 3. Original ending.')).toEqual([
      'There are 3.',
      'Original ending.',
    ])
    expect(buffer.update('There are 3.')).toEqual([])
    expect(buffer.update('There are 3.14 units.')).toEqual(['There are 3.14 units.'])
    expect(buffer.flush('There are 3.14 units.')).toBeNull()
  })

  it('should preserve sentence context when a shortened stream receives revised content', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('First sentence.')).toEqual(['First sentence.'])
    expect(buffer.update('First')).toEqual([])
    expect(buffer.update('First changed.')).toEqual(['First changed.'])
    expect(buffer.flush('First changed.')).toBeNull()
  })

  it.each([
    'Examples include e.g. apples and pears.',
    'Use a fruit, i.e. an apple.',
    'The meeting is at 3 p.m. today.',
    'Examples include “e.g.” apples and pears.',
    'Choose an option e.g. apples and pears.',
    'Read the section i.e. the introduction.',
    'The next step p.m. remains unchanged.',
  ])('should preserve reported dotted abbreviations across every chunk size: %s', (sentence) => {
    const text = `${sentence} Next step.`

    for (let chunkSize = 1; chunkSize <= text.length; chunkSize += 1) {
      expect(speakStreamed(text, chunkSize)).toEqual([sentence, 'Next step.'])
    }
  })

  it.each([
    'Examples include e.g. apples and pears.',
    'Use a fruit, i.e. an apple.',
    'The meeting is at 3 p.m. today.',
    'Choose an option e.g. apples and pears.',
    'Read the section i.e. the introduction.',
    'Read e.',
    'Read i.',
    'Read p.',
    'Choose category e.',
    'Pick option i.',
    'Read section p.',
  ])('should preserve sentence boundaries at every single split: %s', (sentence) => {
    const text = `${sentence} Next sentence.`

    for (let split = 1; split < text.length; split += 1) {
      const buffer = createStreamingSpeechBuffer({locale: 'ko'})
      const spoken = [...buffer.update(text.slice(0, split)), ...buffer.update(text)]
      const remainder = buffer.flush(text)

      expect(remainder === null ? spoken : [...spoken, remainder]).toEqual([
        sentence,
        'Next sentence.',
      ])
    }
  })

  it.each(['g', 'm', 't'])(
    'should retain the existing immediate handling of unrelated lowercase %s. endings',
    (letter) => {
      const buffer = createStreamingSpeechBuffer({locale: 'ko'})
      const text = `Read ${letter}.`

      expect(buffer.update(text)).toEqual([text])
      expect(buffer.flush(text)).toBeNull()
    },
  )

  it.each(['e', 'i', 'p'])(
    'should hold a possible %s. abbreviation without delaying an earlier sentence',
    (letter) => {
      const buffer = createStreamingSpeechBuffer({locale: 'ko'})
      const prefix = `First sentence. Read ${letter}.`

      expect(buffer.update(prefix)).toEqual(['First sentence.'])
      expect(buffer.update(prefix)).toEqual([])
      expect(buffer.flush(prefix)).toBe(`Read ${letter}.`)
      expect(buffer.flush(prefix)).toBeNull()
    },
  )

  it.each(['e', 'i', 'p'])(
    'should resolve a genuine %s. ending when a separator arrives',
    (letter) => {
      const buffer = createStreamingSpeechBuffer({locale: 'ko'})
      const sentence = `Read ${letter}.`

      expect(buffer.update(sentence)).toEqual([])
      expect(buffer.update(`${sentence} `)).toEqual([sentence])
      expect(buffer.update(`${sentence} Next sentence.`)).toEqual(['Next sentence.'])
      expect(buffer.flush(`${sentence} Next sentence.`)).toBeNull()
    },
  )

  it.each(['e', 'i', 'p'])(
    'should preserve completed lowercase %s. labels and quoted endings',
    (letter) => {
      const buffer = createStreamingSpeechBuffer({locale: 'ko'})
      const text = `Choose category ${letter}. Read “${letter}.” Next sentence.`

      expect(speakStreamed(text, 1)).toEqual([
        `Choose category ${letter}.`,
        `Read “${letter}.”`,
        'Next sentence.',
      ])
      expect(buffer.update(`Choose category ${letter}.`)).toEqual([])
      expect(buffer.update(`Choose category ${letter}.`)).toEqual([])
      expect(buffer.update(`Choose category ${letter}. `)).toEqual([`Choose category ${letter}.`])
      expect(buffer.update(`${text} `)).toEqual([`Read “${letter}.”`, 'Next sentence.'])
      expect(buffer.flush(text)).toBeNull()
    },
  )

  it.each(['e', 'i', 'p'])('should flush a genuine lowercase %s. label exactly once', (letter) => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})
    const text = `Choose category ${letter}.`

    expect(buffer.update(text)).toEqual([])
    expect(buffer.flush(text)).toBe(text)
    expect(buffer.flush(text)).toBeNull()
    expect(buffer.update(text)).toEqual([])
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

  it('should keep Korean No. attached to a following list number across every chunk boundary', () => {
    const text = 'No. 5번. 다음 문장.'
    const characterCount = Array.from(text).length
    const expected = ['No. 5번.', '다음 문장.']
    const spokenByChunkSize = Array.from({length: characterCount}, (_, index) =>
      speakStreamed(text, index + 1),
    )

    expect(spokenByChunkSize).toEqual(Array.from({length: characterCount}, () => expected))
  })

  it('should preserve the current English handling of No. as a completed sentence', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'en'})

    expect(buffer.update('No.')).toEqual(['No.'])
  })

  it('should not merge Korean No. with a following non-number sentence', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('No. Thank you.')).toEqual(['No.', 'Thank you.'])
  })

  it('should flush a terminal Korean No. when no list number follows', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('No.')).toEqual([])
    expect(buffer.flush('No.')).toBe('No.')
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

  it('should flush a longer replacement answer from the beginning', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})
    const replacementAnswer = 'Replacement sentence is much longer.'

    expect(buffer.update('Earlier sentence.')).toEqual(['Earlier sentence.'])
    expect(buffer.flush(replacementAnswer)).toBe(replacementAnswer)
  })

  it('should preserve unchanged completed sentences when flushing a replacement answer', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})
    const streamedAnswer = 'Earlier sentence. Original ending.'
    const replacementAnswer = 'Earlier sentence. Replacement sentence is much longer.'

    expect(buffer.update(streamedAnswer)).toEqual(['Earlier sentence.', 'Original ending.'])
    expect(buffer.flush(replacementAnswer)).toBe('Replacement sentence is much longer.')
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

  it('should retain Unicode sentence boundaries across every UTF-16 streaming prefix', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'en'})
    const text = '😀 Café is open. 🦉 Next sentence.'
    const spoken: string[] = []

    for (let end = 1; end <= text.length; end += 1) {
      spoken.push(...buffer.update(text.slice(0, end)))
    }

    expect(spoken).toEqual(['😀 Café is open.', '🦉 Next sentence.'])
    expect(buffer.flush(text)).toBeNull()
    expect(buffer.update(text)).toEqual([])
  })

  it('should reset consumption after a corrected prefix and a flushed Unicode tail', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'en'})
    const prefix = '😀 First sentence.'
    const revised = '😀 First sentence!'
    const finalText = `${revised} 🦉 Unfinished tail`

    expect(buffer.update(`${prefix} 🦉 Unfinished`)).toEqual([prefix])
    expect(buffer.update(`${revised} 🦉 Unfinished`)).toEqual([])
    expect(buffer.flush(finalText)).toBe('🦉 Unfinished tail')
    expect(buffer.flush(finalText)).toBeNull()

    buffer.reset()

    expect(buffer.update(`${finalText}.`)).toEqual([revised, '🦉 Unfinished tail.'])
    expect(buffer.flush(`${finalText}.`)).toBeNull()
  })
})
