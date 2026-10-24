/** @vitest-environment node */
import {describe, expect, it} from 'vitest'
import {createCloth, parseCloth} from '../cloth'

const data = {
  contacts: [0, 0, 1, 0, 0, 0, 1, 0],
  edges: [0, 1],
  mobility: [0, 1],
  positions: [0, 1, 0, 0, 0, 0],
}

describe('cloth', () => {
  it('should preserve anchors, bound motion and reject inward collision over a long run', () => {
    const cloth = createCloth(data)
    for (let index = 0; index < 1800; index += 1) {
      cloth.advance(1 / 60, 1)
    }
    expect(Array.from(cloth.positions.slice(0, 3))).toEqual([0, 1, 0])
    expect(
      Math.hypot(cloth.positions[3], cloth.positions[4], cloth.positions[5]),
    ).toBeLessThanOrEqual(0.01201)
    expect(cloth.positions[5]).toBeGreaterThanOrEqual(0)
    expect(cloth.positions[3]).not.toBe(0)
    cloth.reset()
    expect(Array.from(cloth.positions)).toEqual(data.positions)
  })

  it('should use fixed steps across different render rates and cap suspended time', () => {
    const slow = createCloth(data)
    const fast = createCloth(data)
    for (let index = 0; index < 60; index += 1) {
      slow.advance(1 / 30, 1)
    }
    for (let index = 0; index < 240; index += 1) {
      fast.advance(1 / 120, 1)
    }
    expect(Array.from(slow.positions)).toEqual(Array.from(fast.positions))
    slow.advance(300, 1)
    expect(Array.from(slow.positions).every(Number.isFinite)).toBe(true)
  })

  it('should reject malformed metadata and invalid constraint indices', () => {
    expect(parseCloth('oops')).toBeNull()
    expect(parseCloth(JSON.stringify({...data, edges: [0, 20]}))).toBeNull()
    expect(parseCloth(JSON.stringify(data))).toEqual(data)
  })
  it('should reject contacts that move anchors and unpaired or overflowing particle data', () => {
    const invalid = {...data, contacts: [0, 0, 10, -1, 0, 0, 1, 0]}
    const unchecked = createCloth(invalid)
    unchecked.advance(1 / 60, 0)
    expect(unchecked.positions[2]).not.toBe(0)
    expect(parseCloth(JSON.stringify(invalid))).toBeNull()
    expect(parseCloth(JSON.stringify({...data, contacts: [0, 0, 2, 0, 0, 0, 1, 0]}))).toBeNull()
    expect(parseCloth(JSON.stringify({...data, contacts: [0, 0, 1, -1, 0, 0, 1, 0]}))).toBeNull()
    expect(parseCloth(JSON.stringify({...data, edges: [0]}))).toBeNull()
    expect(parseCloth(JSON.stringify({...data, positions: [1e100, 1, 0, 0, 0, 0]}))).toBeNull()
  })
})
