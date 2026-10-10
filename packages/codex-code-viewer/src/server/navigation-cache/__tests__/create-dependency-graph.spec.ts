import {describe, expect, it} from 'vitest'
import {createDependencyGraph} from '../create-dependency-graph'

const file = (dependencies: string[] = [], names: string[] = [], surface = '') => ({
  dependencies,
  fingerprint: JSON.stringify([dependencies, names, surface]),
  names,
  surface,
  uncertain: false,
})

describe('createDependencyGraph', () => {
  it('should find new candidates including an initially empty name bucket', () => {
    const graph = createDependencyGraph()
    graph.update('helper.ts', file([], ['greet'], 'export'), 1)
    const before = graph.scope(['helper.ts'], 'greet')
    graph.update('new.ts', file(['helper.ts'], ['hello']), 2)
    expect(graph.scope(['helper.ts'], 'greet')).toEqual(new Set(['helper.ts', 'new.ts']))
    expect(graph.changed(before, 1)).toEqual(new Set())
    expect(graph.changed(graph.scope(['helper.ts'], 'greet'), 1)).toEqual(new Set(['new.ts']))
    expect(graph.scope([], 'absent')).toEqual(new Set())
    graph.update('other.ts', file([], ['absent']), 3)
    expect(graph.changed(graph.scope([], 'absent'), 2)).toEqual(new Set(['other.ts']))
  })
  it('should retain unchanged relationships and mark only a private caller on body edits', () => {
    const graph = createDependencyGraph()
    graph.update('helper.ts', file([], ['greet'], 'export'), 1)
    graph.update('a.ts', file(['helper.ts'], ['greet']), 1)
    graph.update('b.ts', file(['helper.ts'], ['greet']), 1)
    graph.update('a.ts', {...file(['helper.ts'], ['greet']), fingerprint: 'new body'}, 2)
    expect(graph.changed(graph.scope(['helper.ts'], 'greet'), 1)).toEqual(new Set(['a.ts']))
    graph.update('helper.ts', file([], ['greet'], 'new export'), 3)
    expect(graph.changed(graph.scope(['helper.ts'], 'greet'), 2)).toEqual(
      new Set(['helper.ts', 'a.ts', 'b.ts']),
    )
  })
  it('should cover old and new relationships through cycles and remove deleted candidates', () => {
    const graph = createDependencyGraph()
    graph.update('a.ts', file(['b.ts'], ['greet'], 'a'), 1)
    graph.update('b.ts', file(['a.ts'], [], 'b'), 1)
    graph.update('other.ts', file([], [], 'other'), 1)
    graph.update('a.ts', file(['other.ts'], [], 'changed'), 2)
    expect(graph.changed(new Set(['a.ts', 'b.ts', 'other.ts']), 1)).toEqual(
      new Set(['a.ts', 'b.ts', 'other.ts']),
    )
    graph.update('a.ts', null, 3)
    expect(graph.scope([], 'greet')).toEqual(new Set())
    expect(graph.changed(new Set(['a.ts']), 2)).toEqual(new Set(['a.ts']))
  })
  it('should prune propagation for identical summaries and widen uncertain inputs', () => {
    const graph = createDependencyGraph()
    graph.update('a.ts', file([], ['greet']), 1)
    graph.update('a.ts', file([], ['greet']), 2)
    expect(graph.changed(new Set(['a.ts']), 1)).toEqual(new Set())
    graph.update('global.ts', {...file(), uncertain: true}, 3)
    expect(graph.scope(['a.ts'], 'greet')).toEqual(new Set(['a.ts', 'global.ts']))
  })
})
