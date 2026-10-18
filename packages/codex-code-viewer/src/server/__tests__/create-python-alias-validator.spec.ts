import {describe, expect, it} from 'vitest'
import {createPythonAliasValidator} from '../create-python-alias-validator'

describe('createPythonAliasValidator', () => {
  it('should distinguish sequential assignments and preserve copied values', () => {
    const source = 'hello = greet\nhello()\ncopy = hello\nhello = other\nhello()\ncopy()\n'
    const validate = createPythonAliasValidator()
    expect(validate(source, 0, source.indexOf('hello()'))).toBe(true)
    expect(validate(source, 0, source.indexOf('hello', source.indexOf('copy =')))).toBe(true)
    expect(validate(source, 0, source.lastIndexOf('hello()'))).toBe(false)
    expect(validate(source, source.indexOf('copy ='), source.lastIndexOf('copy()'))).toBe(true)
  })
  it('should merge possible branches and separate branch-local states', () => {
    const source =
      'hello = greet\nif ready:\n    hello = other\n    hello()\nelse:\n    hello()\nhello()\n'
    const validate = createPythonAliasValidator()
    expect(validate(source, 0, source.indexOf('hello()'))).toBe(false)
    expect(validate(source, 0, source.lastIndexOf('hello()'))).toBe(true)
    expect(
      validate(
        source,
        source.indexOf('hello = other'),
        source.indexOf('hello()', source.indexOf('else:')),
      ),
    ).toBe(false)
  })
  it('should exclude statically false assignments from the state after a branch', () => {
    const source = 'hello = greet\nif False:\n    hello = other\nhello()\n'
    const validate = createPythonAliasValidator()
    expect(validate(source, 0, source.lastIndexOf('hello()'))).toBe(true)
    expect(validate(source, source.indexOf('hello = other'), source.lastIndexOf('hello()'))).toBe(
      false,
    )
  })
  it('should filter within a function and retain deferred uses from other scopes', () => {
    const source =
      'hello = greet\ndef run():\n    hello()\ndef inner():\n    local = greet\n    local = other\n    local()\n'
    const validate = createPythonAliasValidator()
    expect(validate(source, 0, source.indexOf('hello()'))).toBe(true)
    expect(validate(source, source.indexOf('local = greet'), source.indexOf('local()'))).toBe(false)
  })
  it('should recompute binding states when source content changes', () => {
    const first = 'hello = greet\nhello = other\nhello()\n'
    const second = 'hello = greet\nhello()\n'
    const validate = createPythonAliasValidator()
    expect(validate(first, 0, first.indexOf('hello()'))).toBe(false)
    expect(validate(second, 0, second.indexOf('hello()'))).toBe(true)
  })
  it('should retain every semicolon statement inside its inline conditional suite', () => {
    const source = 'hello = greet\nif False: pass; hello = other\nhello()\n'
    const validate = createPythonAliasValidator()
    expect(validate(source, 0, source.lastIndexOf('hello()'))).toBe(true)
    expect(validate(source, source.indexOf('hello = other'), source.lastIndexOf('hello()'))).toBe(
      false,
    )
  })
})
