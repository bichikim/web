import {describe, expect, it} from 'vitest'

import {getVoiceGenderLabel} from '../voice-labels'

describe('getVoiceGenderLabel', () => {
  it('should label preset and Pomo voice genders', () => {
    expect((['female', 'male', 'neutral'] as const).map(getVoiceGenderLabel)).toEqual([
      '여성',
      '남성',
      'Pomo 기본',
    ])
  })
})
