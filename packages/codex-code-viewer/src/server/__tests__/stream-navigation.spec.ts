import {afterEach, describe, expect, it, vi} from 'vitest'
import * as fileAccess from '../file-access'
import {success} from '../../shared/contracts'
import {streamNavigation} from '../stream-navigation'

describe('streamNavigation', () => {
  afterEach(() => vi.restoreAllMocks())
  it('should expose verified references before alias expansion completes without repeating locations', async () => {
    const finished = Promise.withResolvers<ReturnType<typeof success<[]>>>()
    const location = {column: 3, line: 2, path: 'caller.py'}
    const references = vi.fn((_path, _offset, _sources, progress) => {
      progress.receive([location])
      return finished.promise
    })
    const stream = streamNavigation({
      document: {
        lines: [],
        location: {column: 1, line: 1, path: 'main.py'},
        revision: 'r',
        source: 'greet',
      },
      navigation: 'definition',
      offset: 0,
      path: 'main.py',
      signal: new AbortController().signal,
      workspace: {
        definitions: () => success([{column: 1, line: 1, path: 'main.py'}]),
        followPath: vi.fn(),
        references,
        root: '/missing',
      },
    })
    expect((await stream.next()).value).toMatchObject({
      groups: [{count: 1, path: 'caller.py'}],
      kind: 'references',
    })
    expect((await stream.next()).value).toEqual({kind: 'references', locations: [location]})
    finished.resolve(success([]))
    expect((await Array.fromAsync(stream)).flatMap((batch) => batch.locations)).toEqual([])
  })
  it('should show own references while the initial definition request is pending', async () => {
    const finished =
      Promise.withResolvers<
        ReturnType<typeof success<{path: string; line: number; column: number}[]>>
      >()
    const own = {column: 1, line: 1, path: 'core.mjs'}
    const location = {column: 9, line: 1, path: 'use.mjs'}
    const stream = streamNavigation({
      document: {lines: [], location: own, revision: 'r', source: 'greet'},
      navigation: 'definition',
      offset: 0,
      path: 'core.mjs',
      signal: new AbortController().signal,
      workspace: {
        definitions: (_path, _offset, _sources, progress) => {
          if (typeof progress === 'object') {
            progress.receiveOwnReferences?.([location])
          }
          return finished.promise
        },
        followPath: vi.fn(),
        references: vi.fn(async () => success([location])),
        root: '/missing',
      },
    })
    expect((await stream.next()).value).toMatchObject({
      groups: [{count: 1, path: 'use.mjs'}],
      kind: 'references',
    })
    expect((await stream.next()).value).toEqual({kind: 'references', locations: [location]})
    finished.resolve(success([own]))
    expect(await Array.fromAsync(stream)).toEqual([])
  })
  it('should publish a verified definition while the semantic request is still pending', async () => {
    const finished = Promise.withResolvers<ReturnType<typeof success<[]>>>()
    const location = {column: 3, line: 2, path: 'target.py'}
    const stream = streamNavigation({
      document: {
        lines: [],
        location: {column: 1, line: 1, path: 'caller.py'},
        revision: 'r',
        source: 'greet()',
      },
      navigation: 'definition',
      offset: 0,
      path: 'caller.py',
      signal: new AbortController().signal,
      workspace: {
        definitions: (_path, _offset, _sources, progress) => {
          if (typeof progress === 'object') {
            progress.receive?.([location])
          }
          return finished.promise
        },
        followPath: vi.fn(),
        references: vi.fn(),
        root: '/missing',
      },
    })
    expect((await stream.next()).value).toEqual({kind: 'definition', locations: [location]})
    finished.resolve(success([]))
    expect(await Array.fromAsync(stream)).toEqual([])
  })
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
  it('should deliver every file group before preparing source previews', async () => {
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
    const read = vi.spyOn(fileAccess, 'readSource')
    const first = (await stream.next()).value
    expect(first).toEqual({
      groups: locations.map(({path}) => ({count: 1, path})),
      kind: 'references',
      locations: [],
    })
    expect(read).not.toHaveBeenCalled()
    expect((await stream.next()).value).toEqual({kind: 'references', locations: [locations[0]]})
    const remaining = await Array.fromAsync(stream)
    expect(remaining.length).toBeGreaterThan(1)
    expect(remaining.flatMap((batch) => batch.locations)).toEqual(locations.slice(1))
  })
})
