/** @vitest-environment node */
import {expect, it, vi} from 'vitest'
import {requireEnvironmentValue} from '../require-environment-value'

it.each([
  [' value ', 'value'],
  ['\tMixed Case\n', 'Mixed Case'],
  ['\u00a0value\ufeff', 'value'],
  ['0', '0'],
])('should return the trimmed value %s', (value, expected) => {
  expect(requireEnvironmentValue('CONFIGURATION', value)).toBe(expected)
})

it.each([undefined, '', ' ', '\t\r\n', '\u00a0\ufeff'])(
  'should preserve the named TypeError for missing value %s',
  (value) => {
    expect(() => requireEnvironmentValue('CONFIGURATION', value)).toThrow(TypeError)
    expect(() => requireEnvironmentValue('CONFIGURATION', value)).toThrow(
      'CONFIGURATION is not set',
    )
  },
)

it('should preserve errors thrown while trimming the supplied value', () => {
  const cause = new Error('trim failed')
  const value = {
    trim: vi.fn(() => {
      throw cause
    }),
  } as unknown as string

  let thrown: unknown
  try {
    requireEnvironmentValue('CONFIGURATION', value)
  } catch (error) {
    thrown = error
  }
  expect(thrown).toBe(cause)
  expect(value.trim).toHaveBeenCalledOnce()
})
