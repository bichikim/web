import {describe, expect, it} from 'vitest'
import {mergeScanBatches} from '../merge-scan-batches'

describe('mergeScanBatches', () => {
  it('should combine directory chunks in discovery order and retain completion and version', () => {
    expect(
      mergeScanBatches([
        {complete: true, directories: ['src'], directory: '', files: [], version: 'root'},
        {
          complete: false,
          directories: [],
          directory: 'src',
          files: [{openable: true, path: 'src/a.ts'}],
        },
        {
          complete: true,
          directories: [],
          directory: 'src',
          files: [{openable: true, path: 'src/b.ts'}],
          version: 'source',
        },
      ]),
    ).toEqual([
      {
        complete: true,
        directories: ['src'],
        directory: '',
        failed: false,
        files: [],
        version: 'root',
      },
      {
        complete: true,
        directories: [],
        directory: 'src',
        failed: false,
        files: [
          {openable: true, path: 'src/a.ts'},
          {openable: true, path: 'src/b.ts'},
        ],
        version: 'source',
      },
    ])
  })
  it('should preserve incomplete and failed batches without inventing a completed version', () => {
    expect(
      mergeScanBatches([
        {complete: false, directories: [], directory: '', failed: true, files: []},
      ]),
    ).toEqual([{complete: false, directories: [], directory: '', failed: true, files: []}])
  })
})
