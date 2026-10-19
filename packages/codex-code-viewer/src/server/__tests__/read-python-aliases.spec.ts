import {describe, expect, it} from 'vitest'
import {readPythonAliases} from '../read-python-aliases'

describe('readPythonAliases', () => {
  it('should retain imported aliases and follow direct or qualified name assignments', () => {
    const source =
      '# 🦊\r\nfrom helpers import greet as hello\r\nwelcome = hello\r\n환영 = tools.greet # comment\r\n'
    expect([...readPythonAliases(source)]).toEqual([
      ['2:21', source.indexOf('hello')],
      ['3:11', source.indexOf('welcome')],
      ['4:12', source.indexOf('환영')],
    ])
  })
  it.each([
    'hello: object = greet',
    'hello = (\n    greet\n)',
    'hello = greet; hello()',
    'if ready: hello = greet',
  ])('should retain name aliases in %s', (source) => {
    expect([...readPythonAliases(source).values()]).toContain(source.indexOf('hello'))
    expect(readPythonAliases(source).size).toBe(1)
  })
  it('should retain every binding of chains and positional tuples', () => {
    const source = 'first = second = greet\nthird, fourth = greet, other\n'
    expect([...readPythonAliases(source).values()]).toEqual([
      source.indexOf('first'),
      source.indexOf('second'),
      source.indexOf('third'),
      source.indexOf('fourth'),
    ])
  })
  it('should exclude calls, expressions, literals, comparisons and compound targets', () => {
    const source = [
      'result = greet()',
      'result = greet + other',
      'result = "greet"',
      'if result == greet: pass',
      'result, other = greet',
      'tools.result = greet',
      '# result = greet',
      '"""result = greet"""',
    ].join('\n')
    expect([...readPythonAliases(source)]).toEqual([])
  })
})
