import {describe, expect, it, vi} from 'vitest'
import {readReferenceCandidates} from '../read-reference-candidates'
const file = '/project/core/entry.ts'
const paths = [
  file,
  '/project/core/caller.ts',
  ...Array.from({length: 400}, (_, index) => `/project/unrelated-${index}.ts`),
]
describe('readReferenceCandidates', () => {
  it.each(['export function greet() {}', 'export const greet = () => 1'])(
    'should inspect a bounded set of nearby roots for %s without excluding later project coverage',
    (source) => {
      const read = vi.fn((path: string) =>
        path.endsWith('/caller.ts')
          ? "import {greet as hello} from './entry'; hello()"
          : 'export const other = 1',
      )
      const found = readReferenceCandidates({
        file,
        offset: source.indexOf('greet'),
        paths,
        read,
        source,
      })
      expect(found).toEqual([file, '/project/core/caller.ts'])
      expect(read.mock.calls.length).toBeLessThan(paths.length)
      expect(read).not.toHaveBeenCalledWith(paths.at(-1))
    },
  )
  it.each([
    {offset: 9, source: 'function greet() {}'},
    {offset: 24, source: 'export class Greeting { greet() {} }'},
    {offset: 28, source: 'export interface Greeting { greet(): void }'},
    {offset: 20, source: 'export const obj = {greet: 1}'},
    {offset: 8, source: 'exports.greet = () => 1'},
  ])('should defer context-dependent declarations to the project query: $source', (entry) => {
    const read = vi.fn()
    expect(readReferenceCandidates({...entry, file, paths, read})).toEqual([])
    expect(read).not.toHaveBeenCalled()
  })
  it('should prioritize indexed aliases beyond the nearby inspection window', () => {
    const source = 'export function greet() {}'
    const distant = '/project/consumer/renamed.ts'
    const read = vi.fn(() => 'import {welcome as hello} from "./bridge"; hello()')
    expect(
      readReferenceCandidates({
        candidates: [distant, '/outside/not-in-project.ts'],
        file,
        offset: source.indexOf('greet'),
        paths: [...paths, distant],
        read,
        source,
      }),
    ).toEqual([file, distant])
    expect(read).not.toHaveBeenCalledWith('/outside/not-in-project.ts')
  })
  it('should inspect distant re-exports when nearby roots have no candidates and the index is pending', () => {
    const source = 'export function greet() {}'
    const bridge = '/project/bridge/index.ts'
    const read = vi.fn((path: string) =>
      path === bridge
        ? "export {greet as welcome} from '@study/core'"
        : 'export const unrelated = 1',
    )
    const found = readReferenceCandidates({
      file,
      offset: source.indexOf('greet'),
      paths: [
        file,
        ...Array.from({length: 600}, (_, index) => `/project/core/unrelated-${index}.ts`),
        bridge,
      ],
      read,
      source,
    })
    expect(found).toEqual([file, bridge])
    expect(read).toHaveBeenCalledWith(bridge)
    expect(read.mock.calls.length).toBeLessThanOrEqual(512)
    expect(read).not.toHaveBeenCalledWith('/project/core/unrelated-599.ts')
  })
  it('should stop preliminary discovery when cancellation arrives', () => {
    expect(() =>
      readReferenceCandidates({
        cancelled: () => true,
        file,
        offset: 16,
        paths,
        read: vi.fn(),
        source: 'export function greet() {}',
      }),
    ).toThrow()
  })
})
