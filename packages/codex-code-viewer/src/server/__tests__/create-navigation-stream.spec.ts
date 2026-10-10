import {describe, expect, it, vi} from 'vitest'
import {success} from '../../shared/contracts'
import {createNavigationStream} from '../create-navigation-stream'

describe('createNavigationStream', () => {
  it('should delegate TypeScript work to the cancellable background worker', async () => {
    const input = {navigation: 'definition' as const, offset: 0, path: 'main.ts', revision: 'r'}
    const batch = {
      kind: 'references' as const,
      locations: [{column: 1, line: 1, path: 'caller.ts'}],
    }
    const scan = vi.fn(async function* scan() {
      yield batch
    })
    const read = vi.fn()
    const symbols = vi.fn()
    const stream = createNavigationStream({
      background: {scan},
      followPath: vi.fn(),
      read,
      root: '/project',
      symbols,
    })
    const signal = new AbortController().signal
    const review = {files: ['caller.ts'], retained: ['verified.ts']}
    expect(await Array.fromAsync(stream(input, signal, review))).toEqual([batch])
    expect(scan).toHaveBeenCalledWith(input, signal, review)
    expect(read).not.toHaveBeenCalled()
    expect(symbols).not.toHaveBeenCalled()
  })
  it.each(['main.py', 'main.rb', 'main.rs'])(
    'should retain the workspace-owned analyzer while streaming %s references',
    async (path) => {
      const location = {column: 1, line: 1, path}
      const read = vi.fn(() =>
        success({
          lines: [],
          location,
          revision: 'r',
          source: 'greet',
        }),
      )
      const symbols = vi.fn(async () => success([location]))
      const scan = vi.fn()
      const stream = createNavigationStream({
        background: {scan},
        followPath: vi.fn(),
        read,
        root: '/missing',
        symbols,
      })
      expect(
        await Array.fromAsync(
          stream(
            {navigation: 'definition', offset: 0, path, revision: 'r'},
            new AbortController().signal,
          ),
        ),
      ).toEqual([{kind: 'references', locations: [location]}])
      expect(symbols).toHaveBeenLastCalledWith(path, 0, undefined, {
        kind: 'references',
      })
      expect(scan).not.toHaveBeenCalled()
    },
  )
})
