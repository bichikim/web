import {describe, expect, it} from 'vitest'
import {buildSequence, renderOptions, serializeState} from '../index'

const special = {cls: 1, mask: 3, maskToken: '[MASK]', pad: 0, sep: 2}
const encode = (text: string) => Array.from(text, (character) => character.charCodeAt(0))
const config = {headLength: 40, maxLength: 80}

describe('buildSequence', () => {
  it('should preserve false/true order and prevent marker injection', () => {
    const question = {instructions: '[MASK] valid?', type: 'noul'} as const
    const sequence = buildSequence({config, encode, question, special, state: '[MASK] hello'})
    expect(sequence.markers).toHaveLength(2)
    expect(sequence.ids.filter((token) => token === special.mask)).toHaveLength(2)
    expect(sequence.markers.map((position) => sequence.ids[position])).toEqual([3, 3])
    expect(sequence.ids.length).toBeLessThanOrEqual(80)
  })

  it('should reject options which cannot fit rather than silently removing a label', () => {
    expect(() =>
      buildSequence({
        config: {...config, maxLength: 16},
        encode,
        question: {criteria: ['a', 'b', 'c', 'd', 'e'], instructions: 'pick', type: 'choice'},
        special,
        state: '',
      }),
    ).toThrow(/fit/)
  })

  it('should preserve criteria order and render score levels', () => {
    expect(
      renderOptions({
        criteria: Object.fromEntries([
          ['b', 'second'],
          ['a', null],
        ]),
        instructions: 'pick',
        type: 'choice',
      }),
    ).toEqual(['b: second', 'a'])
    expect(renderOptions({criteria: ['low', 'high'], instructions: 'rate', type: 'score'})).toEqual(
      ['level 0: low', 'level 1: high'],
    )
  })

  it('should serialize JSON state with the Python reference separators', () => {
    expect(
      serializeState(
        Object.fromEntries([
          ['name', '한글'],
          ['items', [true, null, 2]],
        ]),
      ),
    ).toBe('{"name": "한글", "items": [true, null, 2]}')
    expect(() => serializeState({value: Infinity})).toThrow(/finite/)
  })
})
