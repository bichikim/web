import {expect, it, vi} from 'vitest'
import {createJsonCodec} from '..'

it('should parse decoded JSON and serialize without applying read-time transformations', () => {
  const parse = vi.fn((value: unknown) => (typeof value === 'string' ? value.toUpperCase() : null))
  const codec = createJsonCodec(parse)
  expect(codec.encode('hello')).toBe('"hello"')
  expect(parse).not.toHaveBeenCalled()
  expect(codec.decode('"hello"')).toBe('HELLO')
  expect(codec.decode('42')).toBeNull()
})

it('should propagate malformed JSON, parser errors, and unsupported serialization', () => {
  const failure = new Error('invalid')
  const codec = createJsonCodec(() => {
    throw failure
  })
  expect(() => codec.decode('{bad')).toThrow(SyntaxError)
  expect(() => codec.decode('{}')).toThrow(failure)
  const identity = createJsonCodec((value) => value)
  expect(() => identity.encode(undefined)).toThrow(TypeError)
  expect(() => identity.encode(1n)).toThrow(TypeError)
})
