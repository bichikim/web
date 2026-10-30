import {expect, it} from 'vitest'
import {sourceLines} from '../source-lines'

it('should preserve mixed separators and exact positions including the final empty line', () => {
  expect(sourceLines('one\r\ntwo\rthree\n')).toEqual([
    {ending: '\r\n', from: 0, number: 1, text: 'one', to: 3},
    {ending: '\r', from: 5, number: 2, text: 'two', to: 8},
    {ending: '\n', from: 9, number: 3, text: 'three', to: 14},
    {ending: '', from: 15, number: 4, text: '', to: 15},
  ])
  expect(sourceLines('')).toEqual([{ending: '', from: 0, number: 1, text: '', to: 0}])
})
