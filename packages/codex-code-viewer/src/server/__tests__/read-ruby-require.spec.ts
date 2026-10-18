import {describe, expect, it} from 'vitest'
import {readRubyRequire} from '../read-ruby-require'

describe('readRubyRequire', () => {
  it.each([
    ["require_relative('lib/한글')", 'relative', 'lib/한글'],
    ["require 'reports/report'", 'load', 'reports/report'],
  ] as const)('should identify the literal path in %s', (source, kind, path) => {
    expect(readRubyRequire(source, source.indexOf(path))).toEqual({kind, path})
  })
  it.each([
    '# require_relative "lib/helper"',
    'text = "require_relative \'lib/helper\'"',
    'require_relative "#{path}"',
    'require_relative(variable)',
  ])('should ignore comments, strings and dynamic paths in %s', (source) => {
    expect(readRubyRequire(source, source.indexOf('lib/helper'))).toBeUndefined()
  })
})
