import {describe, expect, it} from 'vitest'
import {readPythonImportAliases} from '../read-python-import-aliases'

describe('readPythonImportAliases', () => {
  it('should find multiline, continued, Unicode and multiple imported aliases', () => {
    const source = [
      'from helpers import (\r\n',
      '  greet as 환영, # comment\r\n',
      '  other as second,\r\n)\r\n',
      'from bridge import \\\n    exported as third\n',
      'import helpers as module\n',
    ].join('')
    expect([...readPythonImportAliases(source)]).toEqual([
      ['2:3', source.indexOf('환영')],
      ['3:3', source.indexOf('second')],
      ['6:5', source.indexOf('third')],
      ['7:8', source.lastIndexOf('module')],
    ])
  })
  it('should exclude strings, comments, context managers and exception aliases', () => {
    const source = [
      '"""from helpers import greet as fake"""\n',
      '# import helpers as fake\n',
      'from helpers import greet; unrelated as fake\n',
      'with manager as resource:\n    pass\n',
      'try:\n    pass\nexcept Error as problem:\n    pass\n',
    ].join('')
    expect([...readPythonImportAliases(source)]).toEqual([])
  })
})
