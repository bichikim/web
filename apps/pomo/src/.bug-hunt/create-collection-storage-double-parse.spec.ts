import {expect, it, vi} from 'vitest'

import {createCollectionStorage} from '../features/value-storage'
import {createStorage} from '../features/value-storage/__tests__/fixtures'

it('should parse collection writes once so validation side effects are not duplicated', () => {
  const storage = createStorage()
  let parseCount = 0
  const parse = vi.fn((value: unknown): readonly string[] => {
    parseCount += 1
    if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
      throw new TypeError('Expected strings')
    }
    return value
  })
  const items = createCollectionStorage({
    key: 'items',
    onChange: vi.fn(),
    parse,
    readFailureMessage: 'read failed',
    storage: () => storage,
  })

  items.write(['one'])

  expect(parseCount).toBe(1)
  expect(parse).toHaveBeenCalledExactlyOnceWith(['one'])
})
