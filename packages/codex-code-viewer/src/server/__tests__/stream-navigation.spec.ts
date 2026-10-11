import {afterEach, describe, expect, it, vi} from 'vitest'
import * as fileAccess from '../file-access'
import {success} from '../../shared/contracts'
import {streamNavigation} from '../stream-navigation'

describe('streamNavigation', () => {
  afterEach(() => vi.restoreAllMocks())
  it.each([false, true])('should preview multiple definitions with draft=%s', async (draft) => {
    const source =
      'interface User {id: string}\ninterface User {name: string}\nconst user: User = {}'
    const lines = source.split('\n')
    const locations = [
      {column: 11, line: 1, path: 'main.ts'},
      {column: 11, line: 2, path: 'main.ts'},
    ]
    vi.spyOn(fileAccess, 'resolveFile').mockReturnValue(success('/workspace/main.ts'))
    vi.spyOn(fileAccess, 'readSource').mockReturnValue(success(draft ? '' : source))
    const batches = await Array.fromAsync(
      streamNavigation({
        document: {
          lines: [],
          location: {column: 1, line: 1, path: 'main.ts'},
          revision: 'r',
          source,
        },
        navigation: 'definition',
        offset: source.lastIndexOf('User'),
        path: 'main.ts',
        signal: new AbortController().signal,
        sources: draft ? [{path: 'main.ts', source}] : [],
        workspace: {
          definitions: vi.fn(async () => success(locations)),
          followPath: vi.fn(),
          references: vi.fn(),
          root: '/workspace',
        },
      }),
    )
    expect(batches).toEqual([
      {
        kind: 'definition',
        locations: locations.map((location, index) => ({
          ...location,
          preview: lines.slice(index, index + 5).join('\n'),
        })),
      },
    ])
  })
  it('should deliver the first file before preparing the remaining result batches', async () => {
    const locations = Array.from({length: 1200}, (_, index) => ({
      column: 1,
      line: 1,
      path: `file-${String(index).padStart(4, '0')}.ts`,
    }))
    const references = vi.fn(async () => success(locations))
    const stream = streamNavigation({
      document: {
        lines: [[{kind: 'identifier', navigation: 'definition', offset: 0, text: 'greet'}]],
        location: {column: 1, line: 1, path: 'main.ts'},
        revision: 'r',
        source: 'greet',
      },
      navigation: 'definition',
      offset: 0,
      path: 'main.ts',
      signal: new AbortController().signal,
      workspace: {
        definitions: vi.fn(async () => success([{column: 1, line: 1, path: 'main.ts'}])),
        followPath: vi.fn(),
        references,
        root: '/missing',
      },
    })
    expect((await stream.next()).value).toEqual({kind: 'references', locations: [locations[0]]})
    const remaining = await Array.fromAsync(stream)
    expect(remaining.length).toBeGreaterThan(1)
    expect(remaining.flatMap((batch) => batch.locations)).toEqual(locations.slice(1))
  })
})
