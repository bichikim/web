import {describe, expect, it} from 'vitest'
import {isKnownPresetId} from 'src/features/preset'
import {getPresetData} from '../index'

describe('getPresetData', () => {
  it('should return the registered preset and its music data', () => {
    const preset = getPresetData('hidden-teenieping')

    expect(preset.id).toBe('hidden-teenieping')
    expect(isKnownPresetId(preset.id)).toBe(true)
    expect(preset.musics.length).toBeGreaterThan(0)
    expect(preset.title).toBe('Hidden Teenieping')
  })

  it.each(['not-a-real-preset', 'constructor', 'toString', '__proto__'])(
    'should return the unknown preset for unregistered id %s',
    (id) => {
      expect(getPresetData(id)).toEqual({
        id: '',
        musics: [],
        title: 'Unknown Preset',
      })
    },
  )
})
