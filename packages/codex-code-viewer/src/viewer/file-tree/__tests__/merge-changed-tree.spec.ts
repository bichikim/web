import {expect, it} from 'vitest'
import {buildFileTree} from '../build-file-tree'
import {mergeChangedTree} from '../merge-changed-tree'

it('should retain only changed paths and their ancestors including deleted files', () => {
  const original = buildFileTree([{openable: true, path: 'clean.ts'}], ['empty'])
  const changes = [{kind: 'deleted' as const, openable: true, path: 'src/gone.ts'}]
  const filtered = mergeChangedTree(original, changes, true)
  expect(filtered.map((node) => node.path)).toEqual(['src'])
  expect(filtered[0]).toMatchObject({children: [{change: 'deleted', path: 'src/gone.ts'}]})
  expect(original.map((node) => node.path)).toEqual(['empty', 'clean.ts'])
  expect(mergeChangedTree(original, [], true)).toEqual([])
  expect(mergeChangedTree(original, changes, true, 'missing')).toEqual([])
})

it('should filter overlaid changes in the ordinary file search', () => {
  const original = buildFileTree([{openable: true, path: 'src/match.ts'}], [])
  const changes = [
    {kind: 'modified' as const, openable: true, path: 'other/unrelated.ts'},
    {kind: 'deleted' as const, openable: true, path: 'removed/match.ts'},
  ]
  const result = mergeChangedTree(original, changes, false, 'match')
  expect(result.map((node) => node.path)).toEqual(['removed', 'src'])
  expect(mergeChangedTree([], changes, false, 'missing')).toEqual([])
  expect(mergeChangedTree([], changes, false, '  ')).toHaveLength(2)
})
