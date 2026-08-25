import {describe, expect, it} from 'vitest'

import {
  createDialogueScriptRequest,
  MAXIMUM_DIALOGUE_SCRIPT_LENGTH,
  MINIMUM_DIALOGUE_SCRIPT_LENGTH,
} from '../script-prompt'

describe('createDialogueScriptRequest', () => {
  it('should include only the trimmed request and generation length', () => {
    const request = createDialogueScriptRequest({
      length: 150,
      topic: '  오늘 힘이 나는 말 한마디  ',
    })

    expect(request).toBe('사용자 요청: 오늘 힘이 나는 말 한마디\n생성 분량: 150자')
  })

  it('should clamp the requested length to the supported range', () => {
    expect(createDialogueScriptRequest({length: 1, topic: '응원'})).toContain(
      `생성 분량: ${MINIMUM_DIALOGUE_SCRIPT_LENGTH}자`,
    )
    expect(createDialogueScriptRequest({length: 999, topic: '응원'})).toContain(
      `생성 분량: ${MAXIMUM_DIALOGUE_SCRIPT_LENGTH}자`,
    )
  })
})
