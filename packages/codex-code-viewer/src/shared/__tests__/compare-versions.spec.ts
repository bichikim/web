import {describe, expect, it} from 'vitest'
import {compareVersions} from '../compare-versions'

describe('compareVersions', () => {
  it.each([
    ['0.10.0', '0.9.0', 1],
    ['1.0.0', '0.99.99', 1],
    ['1.0.0', '1.0.0+build.1', 0],
    ['1.0.0-beta.10', '1.0.0-beta.2', 1],
    ['1.0.0', '1.0.0-rc.1', 1],
    ['1.0.0-alpha', '1.0.0-alpha.1', -1],
    ['1.0.0-1', '1.0.0-alpha', -1],
    ['0.5.0', '0.6.0', -1],
  ])('should compare %s against %s', (left, right, expected) => {
    expect(compareVersions(left, right)).toBe(expected)
  })
  it.each(['1.2', '01.2.3', '1.2.3-01', '1.2.3;echo bad'])('should reject %s', (version) => {
    expect(() => compareVersions(version, '1.0.0')).toThrow()
  })
})
