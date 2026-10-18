import {expect, it, vi} from 'vitest'

import {parseSceneStyle} from '../parse-scene-style'

it.each(['original', 'scribble'])('should retain the stored style %s', (value) => {
  expect(parseSceneStyle(value)).toBe(value)
})

it.each([
  {label: 'missing', value: undefined},
  {label: 'null', value: null},
  {label: 'empty text', value: ''},
  {label: 'capitalized text', value: 'Original'},
  {label: 'padded text', value: 'scribble '},
  {label: 'unknown text', value: 'unknown'},
  {label: 'number', value: 0},
  {label: 'NaN', value: Number.NaN},
  {label: 'boolean', value: false},
  {label: 'bigint', value: 1n},
  {label: 'symbol', value: Symbol('original')},
  {label: 'array', value: ['original']},
  {label: 'object', value: {style: 'original'}},
  {label: 'boxed text', value: Object('original')},
])('should reject $label without interpreting it as a style', ({value}) => {
  expect(parseSceneStyle(value)).toBeNull()
})

it('should reject objects without reading or invoking their conversion capabilities', () => {
  const access = vi.fn(() => {
    throw new Error('value must not be inspected')
  })
  const value = new Proxy({}, {get: access})

  expect(parseSceneStyle(value)).toBeNull()
  expect(access).not.toHaveBeenCalled()
})
