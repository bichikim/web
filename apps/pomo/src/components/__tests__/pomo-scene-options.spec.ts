import {describe, expect, it} from 'vitest'

import {resolvePSceneGaze, resolvePSceneViseme} from '../pomo-scene-options'

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

describe('resolvePSceneViseme', () => {
  it('should keep an external mouth through its delayed return without masking live dialogue', () => {
    expect(resolvePSceneViseme('rest', false, null, 'open')).toBe('open')
    expect(resolvePSceneViseme('wide', true, null, 'open')).toBe('wide')
    expect(resolvePSceneViseme('round', false, null, 'rest')).toBe('round')
  })
})
