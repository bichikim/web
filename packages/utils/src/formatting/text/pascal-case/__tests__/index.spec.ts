import {describe, expect, it} from 'vitest'
import {pascalCase} from '../'

describe('pascal-case', () => {
  it('return pascal case', () => {
    expect(pascalCase('foo-bar')).toBe('FooBar')
  })
})
