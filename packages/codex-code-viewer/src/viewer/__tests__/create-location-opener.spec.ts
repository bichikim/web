import {describe, expect, it, vi} from 'vitest'
import {createLocationOpener} from '../create-location-opener'

describe('createLocationOpener', () => {
  it.each([
    '/project/main.ts',
    'C:/project/main.ts',
    'C:\\project\\main.ts',
    '\\\\server\\share\\main.ts',
  ])(
    'should open the absolute address %s instead of navigating the current workspace',
    async (path) => {
      const open = vi.fn(async () => true)
      const go = vi.fn(async () => {})
      await createLocationOpener({go, open, session: () => null})({column: 1, line: 1, path})
      expect(open).toHaveBeenCalledWith(path, undefined)
      expect(go).not.toHaveBeenCalled()
    },
  )
  it('should keep relative navigation in the current workspace', async () => {
    const open = vi.fn(async () => true)
    const go = vi.fn(async () => {})
    const location = {column: 3, line: 5, path: 'src/main.ts'}
    await createLocationOpener({go, open, session: () => null})(location)
    expect(go).toHaveBeenCalledWith(location, undefined)
    expect(open).not.toHaveBeenCalled()
  })
})
