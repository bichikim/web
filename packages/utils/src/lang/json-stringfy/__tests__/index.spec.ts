import {jsonStringify} from '../'
import {describe, it, expect} from 'vitest'
describe('jsonStringify', () => {
  it('should return string', async () => {
    const result = jsonStringify({
      foo: 'foo',
    })
    expect(result).toBe('{"foo":"foo"}')
  })
  // todo fix test
  it.skip('should return string', async () => {
    const obj = {props: {} as any}
    obj.props = obj
    const result = jsonStringify(obj)
    expect(result).toBe('')
  })
})
