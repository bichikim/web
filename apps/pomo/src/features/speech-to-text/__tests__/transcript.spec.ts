import {describe, expect, it} from 'vitest'

import {appendSpeechTranscript} from '../index'

describe('appendSpeechTranscript', () => {
  it('should append a trimmed utterance to editable text', () => {
    expect(appendSpeechTranscript('기존 문장  ', '  새 문장  ')).toBe('기존 문장 새 문장')
  })

  it('should ignore an empty recognition result', () => {
    expect(appendSpeechTranscript('기존 문장', '   ')).toBe('기존 문장')
  })
})
