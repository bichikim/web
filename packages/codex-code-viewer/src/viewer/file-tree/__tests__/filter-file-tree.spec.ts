import {describe, expect, it} from 'vitest'
import {buildFileTree} from '../build-file-tree'
import {filterFileTree} from '../filter-file-tree'
import {getVisibleNodes} from '../get-visible-nodes'

describe('filterFileTree', () => {
  it('should retain matching descendants and ancestors without changing their order or the source', () => {
    const original = buildFileTree(
      [
        {openable: true, path: 'src/item10.ts'},
        {openable: true, path: 'src/item2.ts'},
        {openable: true, path: 'src/other.ts'},
      ],
      ['empty'],
    )
    const selected = filterFileTree(original, 'ITEM')
    expect(getVisibleNodes(selected, () => true).map((node) => node.path)).toEqual([
      'src',
      'src/item2.ts',
      'src/item10.ts',
    ])
    expect(getVisibleNodes(original, () => true)).toHaveLength(5)
    expect(filterFileTree(original, 'src')[0]).toBe(original[1])
    expect(filterFileTree(original, 'empty')).toEqual([original[0]])
    expect(filterFileTree(original, 'missing')).toEqual([])
  })
})
