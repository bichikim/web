import {describe, expect, it} from 'vitest'
import {isAccessor} from '../'
import {createSignal} from 'solid-js'

describe('is-accessor', () => {
  it.each([
    //
    {result: false, target: 'foo'},
    {result: false, target: undefined},
    {result: false, target: null},
    {result: true, target: () => 'foo'},
    {result: true, target: createSignal('foo')[0]},
  ])('should return $result with $target', ({target, result}) => {
    expect(isAccessor(target)).toBe(result)
  })
})
