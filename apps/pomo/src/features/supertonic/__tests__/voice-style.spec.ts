import {describe, expect, it} from 'vitest'

import {parseSupertonicVoiceStyle} from '../index'

describe('parseSupertonicVoiceStyle', () => {
  it('should normalize nested voice-style tensors into serializable fields', () => {
    expect(
      parseSupertonicVoiceStyle({
        style_dp: {data: [[0.1, 0.2]], dims: [1, 2]},
        style_ttl: {data: [[[0.3]]], dims: [1, 1, 1]},
      }),
    ).toEqual({
      ok: true,
      value: {
        duration: {data: [0.1, 0.2], dimensions: [1, 2]},
        speech: {data: [0.3], dimensions: [1, 1, 1]},
      },
    })
  })

  it('should reject nonnumeric values and tensor dimensions that do not match the data', () => {
    expect(parseSupertonicVoiceStyle(null)).toMatchObject({
      error: {asset: 'voice', code: 'invalid-model-data'},
      ok: false,
    })
    expect(
      parseSupertonicVoiceStyle({
        style_dp: {data: [0.1], dims: [1, 2]},
        style_ttl: {data: [0.3], dims: [1]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
    expect(
      parseSupertonicVoiceStyle({
        style_dp: {data: [Number.NaN], dims: [1]},
        style_ttl: {data: [0.3], dims: [1]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
    expect(
      parseSupertonicVoiceStyle({
        style_dp: {data: [0.1], dims: [1]},
        style_ttl: {data: [0.3], dims: [2]},
      }),
    ).toMatchObject({error: {asset: 'voice', code: 'invalid-model-data'}, ok: false})
  })
})
