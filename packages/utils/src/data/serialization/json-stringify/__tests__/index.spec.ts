import {jsonStringify} from '../'
import {describe, expect, it, vi} from 'vitest'
import {stringify} from 'safe-stable-stringify'

vi.mock('safe-stable-stringify', async () => {
  const module: any = await import('safe-stable-stringify')

  return {
    ...module,
    stringify: vi.fn(module.stringify),
  }
})

describe('jsonStringify', () => {
  it('should return string', async () => {
    const result = jsonStringify({
      foo: 'foo',
    })

    expect(result).toBe('{"foo":"foo"}')
  })

  it('should return string with circular', async () => {
    const obj = {props: {} as any}

    obj.props = obj
    const result = jsonStringify(obj)

    expect(result).toBe('{"props":"[Circular]"}')
  })

  it('should return empty defaultValue when error occurs', async () => {
    // mock stringify to throw error
    vi.mocked(stringify).mockImplementation(() => {
      throw new Error('test')
    })

    const result = jsonStringify({
      foo: '',
    })

    expect(result).toBe('')
  })
})
