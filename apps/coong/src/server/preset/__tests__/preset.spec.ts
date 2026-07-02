import {describe, expect, it} from 'vitest'
import {getPresetData, getPresetEnforceMusics, isKnownPresetId} from '../index'

describe('isKnownPresetId', () => {
  it('should return true for a registered preset id', () => {
    expect(isKnownPresetId('hidden-teenieping')).toBe(true)
  })

  it('should return false for an unknown preset id', () => {
    expect(isKnownPresetId('not-a-real-preset')).toBe(false)
  })
})

describe('getPresetEnforceMusics', () => {
  it('should return musics for a known preset', () => {
    const preset = getPresetData('hidden-teenieping')

    expect(getPresetEnforceMusics('hidden-teenieping', preset)).toEqual(preset.musics)
  })

  it('should return undefined for an unknown preset id', () => {
    const preset = getPresetData('not-a-real-preset')

    expect(getPresetEnforceMusics('not-a-real-preset', preset)).toBeUndefined()
  })

  it('should return undefined when preset id is missing', () => {
    expect(getPresetEnforceMusics(undefined, getPresetData('hidden-teenieping'))).toBeUndefined()
  })

  it('should return undefined when preset data is missing', () => {
    expect(getPresetEnforceMusics('hidden-teenieping', undefined)).toBeUndefined()
  })
})
