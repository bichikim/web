import {describe, expect, it} from 'vitest'
import {getArrayPath} from '../'
import {describe, it, expect} from 'vitest'
describe('getArrayPath', () => {
  it('should return array path with string', () => {
    expect(getArrayPath('path.path1')).toEqual(['path', 'path1'])
  })
  it('should return array path with array', () => {
    expect(getArrayPath(['path', 'path1'])).toEqual(['path', 'path1'])
  })
})
