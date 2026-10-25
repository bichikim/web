import {expect, it} from 'vitest'
import {createChangeRows} from '../create-change-rows'
import {createLineChanges} from '../create-line-changes'

it('should keep context within neighboring changes so old and current line numbers stay aligned', () => {
  const source = 'header\nkeep\nnew value\ncontext\ntail\nadded line'
  const hunks = createLineChanges('header\nremoved line\nkeep\nold value\ncontext\ntail', source)
  const rows = createChangeRows({active: 1, base: 'HEAD', hunks, path: 'main.txt', source})
  expect(rows).toEqual([
    {current: 2, kind: 'context', previous: 3, text: 'keep'},
    {current: null, kind: 'deleted', previous: 4, text: 'old value'},
    {current: 3, kind: 'added', previous: null, text: 'new value'},
    {current: 4, kind: 'context', previous: 5, text: 'context'},
    {current: 5, kind: 'context', previous: 6, text: 'tail'},
  ])
})
it('should retain deleted contents for an emptied file without inventing context rows', () => {
  expect(
    createChangeRows({
      active: 0,
      base: 'HEAD',
      hunks: createLineChanges('only', ''),
      path: 'main.txt',
      source: '',
    }),
  ).toEqual([{current: null, kind: 'deleted', previous: 1, text: 'only'}])
})
