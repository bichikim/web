import {describe, expect, it, vi} from 'vitest'
import {buildFileTree} from '../build-file-tree'
import {getVisibleNodes} from '../get-visible-nodes'

describe('getVisibleNodes', () => {
  const tree = () =>
    buildFileTree([
      {openable: true, path: 'src/nested/item10.ts'},
      {openable: true, path: 'src/nested/item2.ts'},
      {openable: true, path: 'src/main.ts'},
      {openable: true, path: 'test/hidden.ts'},
      {openable: false, path: 'README.md'},
      {openable: false, path: 'src/main.ts'},
    ])

  it('preserves sorted reading order, duplicate resolution and node identity', () => {
    const roots = tree()
    const expanded = vi.fn((_path: string) => true)
    const nodes = getVisibleNodes(roots, expanded)
    expect(nodes.map((node) => node.path)).toEqual([
      'src',
      'src/nested',
      'src/nested/item2.ts',
      'src/nested/item10.ts',
      'src/main.ts',
      'test',
      'test/hidden.ts',
      'README.md',
    ])
    expect(nodes[0]).toBe(roots[0])
    const src = roots[0]
    expect(src.kind).toBe('directory')
    if (src.kind === 'directory') {
      expect(nodes[1]).toBe(src.children[0])
      expect(nodes[4]).toBe(src.children[1])
    }
    expect(nodes[4]).toMatchObject({openable: false})
    expect(expanded.mock.calls).toEqual([['src'], ['src/nested'], ['test']])
  })

  it('does not inspect descendants of collapsed folders or mutate the hierarchy', () => {
    const roots = tree()
    const before = structuredClone(roots)
    const expanded = vi.fn((path: string) => path === 'src')
    expect(getVisibleNodes(roots, expanded).map((node) => node.path)).toEqual([
      'src',
      'src/nested',
      'src/main.ts',
      'test',
      'README.md',
    ])
    expect(expanded.mock.calls).toEqual([['src'], ['src/nested'], ['test']])
    expect(roots).toEqual(before)
  })

  it('propagates the original expansion error without inspecting later folders', () => {
    const error = new Error('expansion failed')
    const expanded = vi.fn((path: string) => {
      if (path === 'src/nested') {
        throw error
      }
      return true
    })
    expect(() => getVisibleNodes(tree(), expanded)).toThrow(error)
    expect(expanded.mock.calls).toEqual([['src'], ['src/nested']])
  })

  it('returns a fresh empty result without calling the expansion predicate', () => {
    const expanded = vi.fn(() => true)
    const first = getVisibleNodes([], expanded)
    expect(first).toEqual([])
    expect(getVisibleNodes([], expanded)).not.toBe(first)
    expect(expanded).not.toHaveBeenCalled()
  })
})
