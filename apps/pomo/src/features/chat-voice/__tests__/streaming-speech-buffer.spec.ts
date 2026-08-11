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

  it('should treat a completed line as a speech boundary and reset for the next answer', () => {
    const buffer = createStreamingSpeechBuffer({locale: 'ko'})

    expect(buffer.update('첫 번째 항목\n두 번째')).toEqual(['첫 번째 항목'])
    buffer.reset()
    expect(buffer.update('새 답변입니다.')).toEqual(['새 답변입니다.'])
  })
})
