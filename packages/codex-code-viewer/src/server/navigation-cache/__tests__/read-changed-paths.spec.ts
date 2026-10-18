import {afterEach, describe, expect, it, vi} from 'vitest'
import {readChangedPaths} from '../read-changed-paths'
import {readPathRevisions} from '../read-path-revisions'
vi.mock('../read-path-revisions', () => ({readPathRevisions: vi.fn()}))
afterEach(() => vi.clearAllMocks())
describe('readChangedPaths', () => {
  it('should retain a missing optional resolution input and detect its creation', async () => {
    const inputs = new Map([['/project/entry.d.ts.map', 'unreadable']])
    const signal = new AbortController().signal
    vi.mocked(readPathRevisions).mockResolvedValueOnce(new Map([['/project/entry.d.ts.map', null]]))
    expect(await readChangedPaths(inputs, signal)).toEqual([])
    vi.mocked(readPathRevisions).mockResolvedValueOnce(
      new Map([['/project/entry.d.ts.map', 'created']]),
    )
    expect(await readChangedPaths(inputs, signal)).toEqual(['/project/entry.d.ts.map'])
  })
  it('should detect edits and deletions while retaining unchanged resolution inputs', async () => {
    const inputs = new Map([
      ['/project/unchanged', '1'],
      ['/project/edited', '1'],
      ['/project/deleted', '1'],
    ])
    vi.mocked(readPathRevisions).mockResolvedValue(
      new Map([
        ['/project/unchanged', '1'],
        ['/project/edited', '2'],
        ['/project/deleted', null],
      ]),
    )
    expect(await readChangedPaths(inputs, new AbortController().signal)).toEqual([
      '/project/edited',
      '/project/deleted',
    ])
  })
})
