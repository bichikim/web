import {expect, it} from 'vitest'
import {createPromptMessages, parseSettings, resolvePreset} from '../settings'

it('should preserve the user idea separately from English-only image instructions', () => {
  const messages = createPromptMessages('추상화 춤추는 햄버거')
  expect(messages[0]).toMatchObject({role: 'system'})
  expect(messages[0]?.content).toContain('English')
  expect(messages[1]).toEqual({content: '추상화 춤추는 햄버거', role: 'user'})
})

it('should accept supported settings and reject invalid dimensions and seeds', () => {
  const settings = {height: 512, seed: 0, steps: 4, variant: 'ternary', width: 512}
  expect(parseSettings(settings)).toEqual(settings)
  expect(() => parseSettings({...settings, width: 513})).toThrow()
  expect(() => parseSettings({...settings, steps: 51})).toThrow()
  expect(() => parseSettings({...settings, seed: -1})).toThrow()
  expect(() => parseSettings({...settings, height: 2048})).toThrow()
})

it.each(['1:1', '4:3', '3:4', '16:9', '9:16'] as const)(
  'should produce supported dimensions for %s',
  (ratio) => {
    const size = resolvePreset(ratio)
    expect(size.width % 16).toBe(0)
    expect(size.height % 16).toBe(0)
    expect(size.width).toBeGreaterThanOrEqual(256)
    expect(size.height).toBeLessThanOrEqual(1024)
  },
)
