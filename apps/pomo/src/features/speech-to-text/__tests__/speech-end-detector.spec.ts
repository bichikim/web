import {describe, expect, it} from 'vitest'

import {createSpeechEndState} from '../speech-end-detector'

describe('createSpeechEndState', () => {
  it('should ignore an isolated noise spike', () => {
    const state = createSpeechEndState()

    expect(state.push({energy: 0.02, timestamp: 0})).toBe(false)
    expect(state.push({energy: 0, timestamp: 1_000})).toBe(false)
  })

  it('should emit once after sustained speech followed by 800ms of silence', () => {
    const state = createSpeechEndState()

    expect(state.push({energy: 0.02, timestamp: 0})).toBe(false)
    expect(state.push({energy: 0.02, timestamp: 50})).toBe(false)
    expect(state.push({energy: 0.02, timestamp: 100})).toBe(false)
    expect(state.push({energy: 0, timestamp: 899})).toBe(false)
    expect(state.push({energy: 0, timestamp: 900})).toBe(true)
    expect(state.push({energy: 0, timestamp: 1_800})).toBe(false)
  })

  it('should treat low speech energy as activity before declaring an endpoint', () => {
    const state = createSpeechEndState()

    state.push({energy: 0.02, timestamp: 0})
    state.push({energy: 0.02, timestamp: 50})
    state.push({energy: 0.02, timestamp: 100})
    expect(state.push({energy: 0.012, timestamp: 700})).toBe(false)
    expect(state.push({energy: 0, timestamp: 1_499})).toBe(false)
    expect(state.push({energy: 0, timestamp: 1_500})).toBe(true)
  })
})
