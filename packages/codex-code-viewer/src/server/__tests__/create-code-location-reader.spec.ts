import {describe, expect, it, vi} from 'vitest'
import {createCodeLocationReader} from '../create-code-location-reader'
import {readSource, resolveFile} from '../file-access'
import {failure} from '../../shared/contracts'
vi.mock('../file-access', () => ({
  readSource: vi.fn(() => ({ok: true, value: 'first\r\nsecond\nthird'})),
  resolveFile: vi.fn((_root: string, path: string) => ({ok: true, value: path})),
}))
describe('createCodeLocationReader', () => {
  it('should read each file once for many destinations and retain their coordinates', () => {
    vi.mocked(readSource).mockClear()
    const read = createCodeLocationReader('/project', new Map())
    expect(Array.from({length: 1000}, () => read('/project/main.ts', 14))).toEqual(
      Array.from({length: 1000}, () => ({ok: true, value: {column: 1, line: 3, path: 'main.ts'}})),
    )
    expect(readSource).toHaveBeenCalledTimes(1)
  })
  it('should use drafts and discard cached sources between requests', () => {
    const first = createCodeLocationReader('/project', new Map([['/project/main.ts', 'a\nb']]))
    const second = createCodeLocationReader('/project', new Map([['/project/main.ts', 'ab']]))
    expect(first('/project/main.ts', 2)).toMatchObject({value: {column: 1, line: 2}})
    expect(second('/project/main.ts', 1)).toMatchObject({value: {column: 2, line: 1}})
  })
  it('should retain a read failure without retrying it for every destination', () => {
    vi.mocked(readSource).mockClear().mockReturnValueOnce(failure('read-failed'))
    const read = createCodeLocationReader('/project', new Map())
    expect(read('/project/main.ts', 0)).toEqual(failure('read-failed'))
    expect(read('/project/main.ts', 10)).toEqual(failure('read-failed'))
    expect(readSource).toHaveBeenCalledTimes(1)
  })
  it('should reject an inaccessible path before reading its source', () => {
    vi.mocked(readSource).mockClear()
    vi.mocked(resolveFile).mockReturnValueOnce(failure('outside-workspace'))
    const read = createCodeLocationReader('/project', new Map())
    expect(read('/outside/main.ts', 0)).toEqual(failure('outside-workspace'))
    expect(read('/outside/main.ts', 1)).toEqual(failure('outside-workspace'))
    expect(readSource).not.toHaveBeenCalled()
  })
})
