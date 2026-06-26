import {describe, expect, it} from 'vitest'
import {formatDotenv, parseAssignment, parseDotenv, parseKey} from '../key-value'

describe('key-value', () => {
  it('should parse simple assignment', () => {
    expect(parseAssignment('foo=dddd')).toEqual({
      key: 'foo',
      value: 'dddd',
    })
  })

  it('should parse quoted key and value', () => {
    expect(parseAssignment('"foo"="dddd"')).toEqual({
      key: 'foo',
      value: 'dddd',
    })
  })

  it('should keep equal signs inside value', () => {
    expect(parseAssignment('token=a=b=c')).toEqual({
      key: 'token',
      value: 'a=b=c',
    })
  })

  it('should reject assignment without separator', () => {
    expect(() => parseAssignment('foo')).toThrow('Expected KEY=VALUE')
  })

  it('should parse standalone key', () => {
    expect(parseKey('"foo"')).toBe('foo')
  })

  it('should reject standalone key with separator', () => {
    expect(() => parseKey('foo=bar')).toThrow('Secret key must not contain "="')
  })

  it('should parse dotenv content', () => {
    expect(parseDotenv('FOO=bar\n# comment\nTOKEN="a=b"\n')).toEqual({
      FOO: 'bar',
      TOKEN: 'a=b',
    })
  })

  it('should format dotenv output sorted by key', () => {
    expect(formatDotenv({a: 'one', b: 'two words'})).toBe('a="one"\nb="two words"')
  })
})
