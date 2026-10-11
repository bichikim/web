import {describe, expect, it, vi} from 'vitest'
import {type NavigationInput, success} from '../../../shared/contracts'
import {createDependencyGraph} from '../create-dependency-graph'
import {createNavigationCache} from '../create-navigation-cache'

vi.mock('node:path', async () => {
  const actual = await vi.importActual<typeof import('node:path')>('node:path')
  return {...actual, sep: '\\'}
})

describe('createNavigationCache on Windows', () => {
  it('should recheck native destination paths against normalized index paths', async () => {
    expect((await import('node:path')).sep).toBe('\\')
    const graph = createDependencyGraph()
    const summary = (fingerprint: string) => ({
      dependencies: ['helper.ts'],
      fingerprint,
      names: ['greet'],
      surface: '',
      uncertain: false,
    })
    graph.update('src/caller.ts', summary('first'), 1)
    graph.update('src/clean.ts', summary('unchanged'), 1)
    let revision = 1
    const scan = vi.fn(async function* scan() {
      yield {
        kind: 'references' as const,
        locations: [
          {column: 1, line: revision === 1 ? 2 : 4, path: 'src\\caller.ts'},
          {column: 1, line: 3, path: 'src\\clean.ts'},
        ],
      }
    })
    const cache = createNavigationCache({
      index: {
        changed: graph.changed,
        dispose: () => {},
        generation: () => revision,
        refresh: async () => revision,
        scope: graph.scope,
        uncertain: graph.uncertain,
      },
      read: () =>
        success({
          lines: [[{kind: 'identifier', navigation: 'definition', offset: 0, text: 'greet'}]],
          location: {column: 1, line: 1, path: 'helper.ts'},
          revision: 'source',
          source: 'greet',
        }),
      scan,
    })
    const input: NavigationInput = {
      navigation: 'definition',
      offset: 0,
      path: 'helper.ts',
      revision: 'source',
    }
    const query = async () =>
      (await Array.fromAsync(cache.scan(input, new AbortController().signal))).flatMap(
        (batch) => batch.locations,
      )
    try {
      expect(await query()).toEqual([
        {column: 1, line: 2, path: 'src\\caller.ts'},
        {column: 1, line: 3, path: 'src\\clean.ts'},
      ])
      revision = 2
      graph.update('src/caller.ts', summary('edited'), revision)
      const refreshed = [
        {column: 1, line: 3, path: 'src\\clean.ts'},
        {column: 1, line: 4, path: 'src\\caller.ts'},
      ]
      expect(await query()).toEqual(refreshed)
      expect(scan).toHaveBeenLastCalledWith(input, expect.any(AbortSignal), {
        files: ['src/caller.ts'],
        retained: ['src/clean.ts'],
      })
      expect(await query()).toEqual(refreshed)
      expect(scan).toHaveBeenCalledTimes(2)
    } finally {
      cache.dispose()
    }
  })
})
