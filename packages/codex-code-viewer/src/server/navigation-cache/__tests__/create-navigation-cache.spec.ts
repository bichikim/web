import {describe, expect, it, vi} from 'vitest'
import {type NavigationInput, type NavigationResult, success} from '../../../shared/contracts'
import {createNavigationCache} from '../create-navigation-cache'
import {createDependencyGraph} from '../create-dependency-graph'

const input: NavigationInput = {
  navigation: 'definition',
  offset: 13,
  path: 'helper.ts',
  revision: 'r',
}
const location = (path: string, line = 2) => ({column: 1, line, path, preview: 'greet()'})
const setup = (limits: {readonly maxEntries?: number; readonly maxBytes?: number} = {}) => {
  let revision = 1
  let generation = 0
  const graph = createDependencyGraph()
  const update = (path: string, names = ['greet'], dependencies = ['helper.ts']) => {
    revision += 1
    generation += 1
    graph.update(
      path,
      {dependencies, fingerprint: String(revision), names, surface: '', uncertain: false},
      revision,
    )
  }
  graph.update(
    'helper.ts',
    {
      dependencies: [],
      fingerprint: 'helper',
      names: ['greet'],
      surface: 'export',
      uncertain: false,
    },
    1,
  )
  graph.update(
    'first.ts',
    {
      dependencies: ['helper.ts'],
      fingerprint: 'first',
      names: ['greet'],
      surface: '',
      uncertain: false,
    },
    1,
  )
  graph.update(
    'second.ts',
    {
      dependencies: ['helper.ts'],
      fingerprint: 'second',
      names: ['greet'],
      surface: '',
      uncertain: false,
    },
    1,
  )
  let results: NavigationResult[] = [
    {kind: 'references', locations: [location('first.ts'), location('second.ts')]},
  ]
  const scan = vi.fn(async function* scan() {
    // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
    yield* results
  })
  const read = vi.fn(() =>
    success({
      lines: [
        [
          {
            kind: 'identifier' as const,
            navigation: 'definition' as const,
            offset: 13,
            text: 'greet',
          },
        ],
      ],
      location: {column: 1, line: 1, path: 'helper.ts'},
      revision: 'r',
      source: 'export const greet = () => 1',
    }),
  )
  const dispose = vi.fn()
  const cache = createNavigationCache({
    index: {
      changed: graph.changed,
      dispose,
      generation: () => generation,
      refresh: async () => revision,
      scope: graph.scope,
      uncertain: graph.uncertain,
    },
    read,
    scan,
    ...limits,
  })
  const query = (request = input) =>
    Array.fromAsync(cache.scan(request, new AbortController().signal))
  return {
    cache,
    dispose,
    query,
    read,
    scan,
    setResults: (next: NavigationResult[]) => {
      results = next
    },
    update,
  }
}

describe('createNavigationCache', () => {
  it('should reuse completed results including zero usages without repeating analysis', async () => {
    const subject = setup()
    subject.setResults([{kind: 'references', locations: []}])
    expect(await subject.query()).toEqual([{kind: 'references', locations: []}])
    expect(await subject.query()).toEqual([{kind: 'references', locations: []}])
    expect(subject.scan).toHaveBeenCalledOnce()
    subject.update('new.ts')
    subject.setResults([{kind: 'references', locations: [location('new.ts')]}])
    expect((await subject.query()).flatMap((batch) => batch.locations)).toEqual([
      location('new.ts'),
    ])
    expect(subject.scan).toHaveBeenCalledTimes(2)
  })
  it('should show verified file groups before rechecking changed and newly related files', async () => {
    const subject = setup()
    await subject.query()
    subject.update('second.ts')
    subject.update('new.ts', ['hello'])
    subject.setResults([
      {
        kind: 'references',
        locations: [location('first.ts'), location('second.ts', 4), location('new.ts')],
      },
    ])
    const stream = subject.cache.scan(input, new AbortController().signal)
    expect((await stream.next()).value?.locations).toEqual([location('first.ts')])
    expect(subject.scan).toHaveBeenCalledOnce()
    const remaining = await Array.fromAsync(stream)
    expect(subject.scan).toHaveBeenLastCalledWith(input, expect.any(AbortSignal), {
      files: ['second.ts', 'new.ts'],
      retained: ['first.ts'],
    })
    expect(remaining.flatMap((batch) => batch.locations)).toEqual([
      location('second.ts', 4),
      location('new.ts'),
    ])
    expect(subject.scan).toHaveBeenCalledTimes(2)
    const cached = (await subject.query()).flatMap((batch) => batch.locations)
    expect(cached).toHaveLength(3)
    expect(subject.scan).toHaveBeenCalledTimes(2)
  })
  it('should keep cache hits after unrelated changes and isolate unsaved edits', async () => {
    const subject = setup()
    await subject.query()
    subject.update('unrelated.ts', ['other'], [])
    await subject.query()
    expect(subject.scan).toHaveBeenCalledOnce()
    const drafts = {
      ...input,
      sources: [{path: 'helper.ts', source: 'export const greet = () => 2'}],
    }
    await subject.query(drafts)
    expect(subject.scan).toHaveBeenCalledTimes(2)
    await subject.query(drafts)
    expect(subject.scan).toHaveBeenCalledTimes(2)
    await subject.query()
    expect(subject.scan).toHaveBeenCalledTimes(2)
  })
  it('should discard a completed analysis when inputs change during its stream', async () => {
    const subject = setup()
    const stream = subject.cache.scan(input, new AbortController().signal)
    await stream.next()
    subject.update('second.ts')
    await Array.fromAsync(stream)
    await subject.query()
    expect(subject.scan).toHaveBeenCalledTimes(2)
  })
  it('should not cache interrupted streams or accept stale document revisions', async () => {
    const subject = setup()
    const controller = new AbortController()
    const stream = subject.cache.scan(input, controller.signal)
    await stream.next()
    controller.abort()
    await expect(stream.next()).rejects.toThrow()
    await subject.query()
    expect(subject.scan).toHaveBeenCalledTimes(2)
    await expect(subject.query({...input, revision: 'old'})).rejects.toThrow('stale-document')
  })
  it('should retry failed partial streams and release the owned index on disposal', async () => {
    const subject = setup()
    subject.scan.mockImplementationOnce(async function* interrupted() {
      yield {kind: 'references', locations: [location('first.ts')]}
      throw new Error('analysis interrupted')
    })
    await expect(subject.query()).rejects.toThrow('analysis interrupted')
    expect((await subject.query()).flatMap((batch) => batch.locations)).toHaveLength(2)
    expect(subject.scan).toHaveBeenCalledTimes(2)
    subject.cache.dispose()
    expect(subject.dispose).toHaveBeenCalledOnce()
  })
  it('should evict old queries and avoid retaining results above the byte budget', async () => {
    const bounded = setup({maxEntries: 1})
    await bounded.query()
    await bounded.query({...input, offset: 14})
    await bounded.query()
    expect(bounded.scan).toHaveBeenCalledTimes(3)
    const oversized = setup({maxBytes: 1})
    await oversized.query()
    await oversized.query()
    expect(oversized.scan).toHaveBeenCalledTimes(2)
  })
})
