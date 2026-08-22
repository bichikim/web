import {describe, expect, it} from 'vitest'

import {calculateDialogueScriptProgress} from '../progress'

describe('calculateDialogueScriptProgress', () => {
  it('should calculate progress from the generated and target character counts', () => {
    expect(
      calculateDialogueScriptProgress({completed: false, generatedLength: 0, targetLength: 120}),
    ).toBe(0)
    expect(
      calculateDialogueScriptProgress({completed: false, generatedLength: 60, targetLength: 120}),
    ).toBe(48)
  })

  it('should reserve 100 percent for completion', () => {
    expect(
      calculateDialogueScriptProgress({completed: false, generatedLength: 120, targetLength: 120}),
    ).toBe(96)
    expect(
      calculateDialogueScriptProgress({completed: true, generatedLength: 80, targetLength: 120}),
    ).toBe(100)
  })

  it('should keep invalid lengths within the supported progress range', () => {
    expect(
      calculateDialogueScriptProgress({completed: false, generatedLength: -10, targetLength: 0}),
    ).toBe(0)
  })
})
