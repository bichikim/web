import {describe, expect, it} from 'vitest'

import {flatSet, noteMatchMap, sharpSet} from '../key-match'

describe('keyboard note mappings', () => {
  it('should create the expected playable keyboard bounds', () => {
    expect(flatSet).toHaveLength(94)
    expect(flatSet.at(0)).toMatchObject({fullName: 'A-1', key: 2})
    expect(flatSet.at(-1)).toMatchObject({fullName: 'C12', key: 161})
    expect(sharpSet).toHaveLength(92)
    expect(sharpSet.at(0)).toMatchObject({fullName: 'A#-1', key: 3, rightEmpty: true})
  })

  it('should expose note names through the combined lookup map', () => {
    expect(noteMatchMap.get('C4')).toBe(65)
    expect(noteMatchMap.get('F#4')).toBe(71)
    expect(noteMatchMap.has('unknown')).toBe(false)
  })
})
