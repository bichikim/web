import {describe, expect, it, vi} from 'vitest'
import {createDependencyGraph} from '../create-dependency-graph'
import {createStoredSources} from '../create-stored-sources'
import type {IndexedSource} from '../types'
import type {SourceIndexSnapshot} from '../create-source-index-store'

const source: IndexedSource = {
  revision: 'saved',
  summary: {
    fingerprint: 'saved',
    imports: [],
    names: ['greet'],
    surface: 'saved',
    uncertain: false,
  },
}
const snapshot: SourceIndexSnapshot = {
  configurations: [],
  entries: [{file: {...source.summary, dependencies: []}, path: 'entry.ts', source}],
}
const setup = () => {
  const pending = Promise.withResolvers<SourceIndexSnapshot | undefined>()
  const storage = {read: vi.fn(() => pending.promise), write: vi.fn(async () => true)}
  const graph = createDependencyGraph()
  const sources = new Map<string, IndexedSource>()
  const controller = new AbortController()
  const onRestore = vi.fn()
  const stored = createStoredSources({
    graph,
    onRestore,
    signal: controller.signal,
    sources,
    storage,
  })
  stored.configure('[]')
  return {
    controller,
    graph,
    onRestore,
    pending,
    setConfiguration: stored.configure,
    sources,
    storage,
    stored,
  }
}
describe('createStoredSources', () => {
  it('should leave disk loading dormant until analysis has started and share its completion', async () => {
    const subject = setup()
    expect(subject.storage.read).not.toHaveBeenCalled()
    const pending = subject.stored.restore()
    expect(subject.storage.read).toHaveBeenCalledOnce()
    expect(subject.stored.restore()).toBe(pending)
    expect(subject.sources.size).toBe(0)
    subject.pending.resolve(snapshot)
    await pending
    expect(subject.onRestore).toHaveBeenCalledExactlyOnceWith(new Map())
    await subject.stored.restore()
    expect(subject.onRestore).toHaveBeenCalledOnce()
    expect(subject.sources.get('entry.ts')).toEqual(source)
  })
  it('should discard a snapshot when configuration changes while it is loading', async () => {
    const subject = setup()
    const pending = subject.stored.restore()
    subject.setConfiguration('["changed"]')
    subject.pending.resolve(snapshot)
    expect(await pending).toBeUndefined()
    expect(subject.sources.size).toBe(0)
    expect(subject.graph.snapshot()).toEqual([])
  })
  it('should not overwrite summaries already refreshed from the filesystem', async () => {
    const subject = setup()
    const current = {...source, revision: 'current'}
    subject.sources.set('entry.ts', current)
    expect(await subject.stored.restore()).toBeUndefined()
    expect(subject.storage.read).not.toHaveBeenCalled()
    expect(subject.sources.get('entry.ts')).toBe(current)
  })
  it('should discard late hydration after the owner is disposed', async () => {
    const subject = setup()
    const pending = subject.stored.restore()
    subject.controller.abort()
    subject.pending.resolve(snapshot)
    expect(await pending).toBeUndefined()
    expect(subject.sources.size).toBe(0)
  })
})
