import {expect, it} from 'vitest'
import {selectTableRows} from '../select-table-rows'

it('should filter cells literally and sort numeric columns without mutating input rows', () => {
  const rows = [
    ['name', 'count'],
    ['Beta', '10'],
    ['alpha', '2'],
    ['ALPHA', '1'],
  ]
  expect(
    selectTableRows({header: true, query: 'alpha', rows, sort: {column: 1, descending: false}}),
  ).toEqual([
    ['ALPHA', '1'],
    ['alpha', '2'],
  ])
  expect(rows[1]).toEqual(['Beta', '10'])
})
it('should retain rows without a header and support descending ordering', () => {
  expect(
    selectTableRows({
      header: false,
      query: '',
      rows: [
        ['a', '2'],
        ['b', '10'],
      ],
      sort: {column: 1, descending: true},
    }),
  ).toEqual([
    ['b', '10'],
    ['a', '2'],
  ])
})
