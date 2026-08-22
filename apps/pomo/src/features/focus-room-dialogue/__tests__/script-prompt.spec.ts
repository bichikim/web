import {describe, expect, it} from 'vitest'

import {
  createDialogueScriptRequest,
  MAXIMUM_DIALOGUE_SCRIPT_LENGTH,
  MINIMUM_DIALOGUE_SCRIPT_LENGTH,
} from '../script-prompt'

describe('createDialogueScriptRequest', () => {
  it('should include the trimmed topic and requested length', () => {
    const request = createDialogueScriptRequest({
      length: 150,
      topic: '  오늘 힘이 나는 말 한마디  ',
    })

    expect(request).toContain('주제: 오늘 힘이 나는 말 한마디')
    expect(request).toContain('150자에 최대한 가깝게')
    expect(request).toContain('대사 한 문단만 작성하세요')
  })

  it('should clamp the requested length to the supported range', () => {
    expect(createDialogueScriptRequest({length: 1, topic: '응원'})).toContain(
      `${MINIMUM_DIALOGUE_SCRIPT_LENGTH}자에 최대한 가깝게`,
    )
    expect(createDialogueScriptRequest({length: 999, topic: '응원'})).toContain(
      `${MAXIMUM_DIALOGUE_SCRIPT_LENGTH}자에 최대한 가깝게`,
    )
  })
})
