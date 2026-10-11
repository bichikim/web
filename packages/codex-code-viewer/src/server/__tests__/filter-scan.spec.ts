import {describe, expect, it} from 'vitest'
import type {ScanBatch} from '../../shared/contracts'
import {filterScan} from '../filter-scan'

async function* source(batches: readonly ScanBatch[]): AsyncGenerator<ScanBatch> {
  // oxlint-disable-next-line eslint-js/yield-star-spacing -- Oxfmt formats generator delegation with this spacing.
  yield* batches
}
const empty: ScanBatch = {complete: true, directories: [], directory: '', files: []}

describe('filterScan', () => {
  it('should preserve empty directory completions when there is no filter', async () => {
    expect(await Array.fromAsync(filterScan(source([empty]), ''))).toEqual([empty])
  })
  it('should omit unrelated empty search batches while reporting failures', async () => {
    const failed = {...empty, directory: 'unreadable', failed: true}
    expect(await Array.fromAsync(filterScan(source([empty, failed]), 'missing'))).toEqual([failed])
  })
  it('should retain a matching directory completion even when its final chunk has no matches', async () => {
    const first = {...empty, complete: false, files: [{openable: true, path: 'main.ts'}]}
    const final = {...empty, version: '1'}
    expect(
      await Array.fromAsync(
        filterScan(
          source([first, {...empty, complete: false}, final, {...empty, directory: 'other'}]),
          'main',
        ),
      ),
    ).toEqual([first, final])
  })
  it('should omit non-openable matches from file searches and retain matching folders', async () => {
    const input = {
      ...empty,
      directories: ['src'],
      files: [{openable: false, path: 'src/asset.bin'}],
    }
    expect(await Array.fromAsync(filterScan(source([input]), 'SRC', true))).toEqual([
      {...input, files: []},
    ])
  })
})
