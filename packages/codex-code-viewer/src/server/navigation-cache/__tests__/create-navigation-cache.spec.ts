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
const setup = (
  limits: {
    readonly maxEntries?: number
    readonly maxBytes?: number
    readonly semanticInputs?: () => ReadonlyMap<string, string>
  } = {},
  ranked = false,
) => {
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
  const refresh = vi.fn(async () => revision)
  const unchanged = vi.fn(async () => true)
  const cache = createNavigationCache({
    index: {
      candidates: ranked ? graph.candidates : undefined,
      changed: graph.changed,
      checkpoint: async () => ({bytes: 0, unchanged}),
      dispose,
      generation: () => generation,
      refresh,
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
    refresh,
    scan,
    setResults: (next: NavigationResult[]) => {
      results = next
    },
    unchanged,
    update,
  }
}

describe('createNavigationCache', () => {
  it('should validate complete semantic queries without rebuilding the candidate graph', async () => {
    const subject = setup({semanticInputs: () => new Map()})
    const first = await subject.query()
    expect(first.flatMap((batch) => batch.locations)).toEqual([
      location('first.ts'),
      location('second.ts'),
    ])
    expect(subject.refresh).not.toHaveBeenCalled()
    expect(await subject.query()).toEqual(first)
    expect(subject.scan).toHaveBeenCalledOnce()
    subject.unchanged.mockResolvedValueOnce(false)
    await subject.query()
    expect(subject.scan).toHaveBeenCalledTimes(2)
    expect(subject.refresh).not.toHaveBeenCalled()
  })
  it('should refresh the candidate index after first delivery while semantic search is still running', async () => {
    const subject = setup()
    const resumed = Promise.withResolvers<void>()
    const finish = Promise.withResolvers<void>()
    const indexed = Promise.withResolvers<number>()
    subject.refresh.mockImplementation(() => indexed.promise)
    subject.scan.mockImplementation(async function* scan() {
      yield {kind: 'references', locations: [location('first.ts')]}
      resumed.resolve()
      await finish.promise
      yield {kind: 'references', locations: [location('second.ts')]}
    })
    const stream = subject.cache.scan(input, new AbortController().signal)
    try {
      expect((await stream.next()).value?.locations).toEqual([location('first.ts')])
      expect(subject.refresh).not.toHaveBeenCalled()
      const next = stream.next()
      await resumed.promise
      expect(subject.refresh).toHaveBeenCalledOnce()
      finish.resolve()
      indexed.resolve(1)
      expect((await next).value?.locations).toEqual([location('second.ts')])
      expect((await stream.next()).done).toBe(true)
      expect(subject.refresh).toHaveBeenCalledOnce()
    } finally {
      finish.resolve()
      indexed.resolve(1)
      await stream.return(undefined)
      subject.cache.dispose()
    }
  })
  it('should retry after concurrent index verification fails without caching the partial stream', async () => {
    const subject = setup()
    subject.refresh.mockRejectedValueOnce(new Error('index unavailable'))
    await expect(subject.query()).rejects.toThrow('index unavailable')
    expect((await subject.query()).flatMap((batch) => batch.locations)).toHaveLength(2)
    expect(subject.scan).toHaveBeenCalledTimes(2)
  })
  it('should probe incremental inputs again after concurrent preparation finishes', async () => {
    const subject = setup()
    await subject.query()
    subject.update('second.ts')
    subject.refresh.mockClear()
    subject.refresh.mockResolvedValueOnce(2).mockResolvedValueOnce(2).mockResolvedValue(3)
    await subject.query()
    expect(subject.refresh).toHaveBeenCalledTimes(3)
    // The final probe saw a newer revision, so the streamed result must not replace the earlier cache entry.
    await subject.query()
    expect(subject.scan).toHaveBeenCalledTimes(3)
  })
  it('should forward ranked candidates without restricting complete query roots', async () => {
    const subject = setup({}, true)
    await subject.query()
    expect(subject.scan).toHaveBeenCalledWith(
      input,
      expect.any(AbortSignal),
      expect.objectContaining({candidates: ['helper.ts', 'first.ts', 'second.ts']}),
    )
    expect(subject.scan).toHaveBeenCalledWith(
      input,
      expect.any(AbortSignal),
      expect.not.objectContaining({files: expect.anything()}),
    )
  })
  it('should retain verified groups when the new scan announces files before details', async () => {
    const subject = setup()
    await subject.query()
    subject.update('second.ts')
    subject.setResults([
      {groups: [{count: 1, path: 'second.ts'}], kind: 'references', locations: []},
      {kind: 'references', locations: [location('second.ts', 3)]},
    ])
    const batches = await subject.query()
    expect(batches.find((batch) => batch.groups !== undefined)?.groups).toEqual([
      {count: 1, path: 'first.ts'},
      {count: 1, path: 'second.ts'},
    ])
    const locations = batches.flatMap((batch) => batch.locations)
    expect(locations).toEqual([location('first.ts'), location('second.ts', 3)])
    expect((await subject.query()).flatMap((batch) => batch.locations)).toEqual(locations)
  })
  it('should deliver a complete cold batch before building the dependency index', async () => {
    const subject = setup()
    const stream = subject.cache.scan(input, new AbortController().signal)
    expect((await stream.next()).value?.locations).toEqual([
      location('first.ts'),
      location('second.ts'),
    ])
    expect(subject.refresh).not.toHaveBeenCalled()
    expect(subject.scan).toHaveBeenLastCalledWith(input, expect.any(AbortSignal), {
      files: undefined,
      retained: [],
    })
    await Array.fromAsync(stream)
    expect(subject.refresh).toHaveBeenCalledOnce()
    await subject.query()
    expect(subject.scan).toHaveBeenCalledOnce()
  })
  it('should finish and cache a cold definition without building the dependency index', async () => {
    const subject = setup()
    const definition: NavigationResult = {kind: 'definition', locations: [location('helper.ts')]}
    subject.setResults([definition])
    expect(await subject.query()).toEqual([definition])
    expect(subject.refresh).not.toHaveBeenCalled()
    expect(await subject.query()).toEqual([definition])
    expect(subject.scan).toHaveBeenCalledOnce()
    subject.unchanged.mockResolvedValueOnce(false)
    const updated: NavigationResult = {kind: 'definition', locations: [location('other.ts')]}
    subject.setResults([updated])
    expect(await subject.query()).toEqual([updated])
    expect(subject.scan).toHaveBeenCalledTimes(2)
    expect(subject.refresh).not.toHaveBeenCalled()
  })
  it('should discard cold results when metadata changes without watcher delivery', async () => {
    const subject = setup()
    subject.unchanged.mockResolvedValueOnce(false)
    await subject.query()
    await subject.query()
    expect(subject.scan).toHaveBeenCalledTimes(2)
  })
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
  it('should replay completed usages when another character of the same token is selected', async () => {
    const subject = setup()
    const expected = await subject.query()
    expect(await subject.query({...input, offset: 16})).toEqual(expected)
    expect(subject.scan).toHaveBeenCalledOnce()
    subject.update('second.ts')
    subject.setResults([{kind: 'references', locations: [location('second.ts', 4)]}])
    expect(
      (await subject.query({...input, offset: 15})).flatMap((batch) => batch.locations),
    ).toEqual([location('first.ts'), location('second.ts', 4)])
    expect(subject.scan).toHaveBeenCalledTimes(2)
  })
  it('should keep identical names at distinct source positions in separate cache entries', async () => {
    const subject = setup()
    const document = subject.read()
    subject.read.mockReturnValue(
      success({
        ...document.value,
        lines: [[...document.value.lines[0], {...document.value.lines[0][0], offset: 30}]],
      }),
    )
    await subject.query()
    subject.setResults([{kind: 'references', locations: [location('different.ts')]}])
    expect(await subject.query({...input, offset: 31})).toEqual([
      {kind: 'references', locations: [location('different.ts')]},
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
    await subject.query({...drafts, offset: 16})
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
    await bounded.query({...input, offset: 30})
    await bounded.query()
    expect(bounded.scan).toHaveBeenCalledTimes(3)
    const oversized = setup({maxBytes: 1})
    await oversized.query()
    await oversized.query()
    expect(oversized.scan).toHaveBeenCalledTimes(2)
  })
  it.each(['helper.py', 'helper.rs', 'helper.rb'])(
    'should verify %s references by metadata and invalidate changed checkpoints',
    async (path) => {
      const subject = setup()
      const request = {...input, path}
      await subject.query(request)
      await subject.query(request)
      expect(subject.scan).toHaveBeenCalledOnce()
      expect(subject.refresh).not.toHaveBeenCalled()
      subject.unchanged.mockResolvedValueOnce(false)
      await subject.query(request)
      expect(subject.scan).toHaveBeenCalledTimes(2)
      expect(subject.refresh).not.toHaveBeenCalled()
    },
  )
})
