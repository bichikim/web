import {mkdtempSync, realpathSync, rmSync, writeFileSync} from 'node:fs'
import {tmpdir} from 'node:os'
import {join} from 'node:path'
import {describe, expect, it, vi} from 'vitest'
import {success} from '../../shared/contracts'
import {createPathNavigation} from '../create-path-navigation'

describe('createPathNavigation', () => {
  it('should retain caller cancellation through the native import-path lookup', async () => {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'path-navigation-')))
    writeFileSync(join(root, 'main.py'), 'import helpers')
    const signal = new AbortController().signal
    const locations = [{column: 1, line: 1, path: 'helpers.py'}]
    const symbols = vi.fn(async () => success(locations))
    const followPath = createPathNavigation({
      hasAnalyzer: () => true,
      refresh: vi.fn(),
      resolveModule: vi.fn(),
      root,
      symbols,
    })
    try {
      expect(await followPath('main.py', 7, [], signal)).toEqual(success(locations))
      expect(symbols).toHaveBeenCalledWith('main.py', 7, [], {kind: 'definition', signal})
    } finally {
      rmSync(root, {force: true, recursive: true})
    }
  })
})
