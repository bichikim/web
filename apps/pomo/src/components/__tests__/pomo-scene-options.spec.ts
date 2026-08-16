import {describe, expect, it} from 'vitest'

import {resolvePSceneGaze} from '../pomo-scene-options'

describe('resolvePSceneGaze', () => {
  it('should force user-facing scenes while dialogue is active', () => {
    expect(resolvePSceneGaze('focused', true)).toBe('user')
    expect(resolvePSceneGaze('user', true)).toBe('user')
  })

  it('should restore the configured gaze after dialogue ends', () => {
    expect(resolvePSceneGaze('focused', false)).toBe('focused')
    expect(resolvePSceneGaze('user', false)).toBe('user')
  })
})
