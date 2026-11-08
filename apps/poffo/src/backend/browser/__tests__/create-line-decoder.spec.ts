/** @vitest-environment node */
import {expect, test} from 'vitest'
import {createLineDecoder} from '../create-line-decoder'

test('should preserve fragmented large lines and split multiple completed lines in order', () => {
  const decode = createLineDecoder()
  const size = 1024 * 1024
  const content = 'a'.repeat(size)
  const chunk = 1024
  for (let offset = 0; offset < content.length; offset += chunk) {
    expect(decode(content.slice(offset, offset + chunk))).toEqual([])
  }
  expect(decode('\nnext\npartial')).toEqual([content, 'next'])
  expect(decode('-tail\n')).toEqual(['partial-tail'])
  expect(decode('')).toEqual([])
})
