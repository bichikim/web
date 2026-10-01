// @vitest-environment jsdom
import {Blob as NodeBlob} from 'node:buffer'
import {unzipSync} from 'fflate'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {createReceivedFiles} from '../received-files'

afterEach(() => vi.unstubAllGlobals())
const prepare = (limit = 10) => {
  let serial = 0
  const revoke = vi.fn()
  vi.stubGlobal('URL', {
    createObjectURL: () => {
      serial += 1
      return `blob:${serial}`
    },
    revokeObjectURL: revoke,
  })
  return {files: createReceivedFiles(limit), revoke}
}
describe('createReceivedFiles', () => {
  it('should retain multiple files at the exact limit and evict oldest content when exceeded', () => {
    const {files, revoke} = prepare()
    files.add(new Blob(['12345']), 'first.txt')
    files.add(new Blob(['67890']), 'second.txt')
    expect(files.retainedBytes()).toBe(10)
    files.add(new Blob(['!']), 'third.txt')
    expect(files.state.files.map((file) => file.removed)).toEqual(['capacity', null, null])
    expect(files.retainedBytes()).toBe(6)
    expect(revoke).toHaveBeenCalledWith('blob:1')
  })
  it('should immediately remove manually deleted cards and release their contents', () => {
    const {files, revoke} = prepare()
    files.add(new Blob(['a']), 'image.png')
    files.add(new Blob(['b']), 'notes.txt')
    files.remove(files.state.files[0].id)
    expect(files.state.files.map((file) => file.name)).toEqual(['notes.txt'])
    files.clearRemoved()
    expect(files.state.files.map((file) => file.name)).toEqual(['notes.txt'])
    files.removeAll()
    expect(files.state.files).toEqual([])
    expect(files.retainedBytes()).toBe(0)
    expect(revoke).toHaveBeenCalledTimes(2)
  })
  it('should clear every card including evicted and manually deleted files', () => {
    const {files, revoke} = prepare(2)
    files.add(new Blob(['aa']), 'evicted.txt')
    files.add(new Blob(['b']), 'deleted.txt')
    files.remove(files.state.files[1].id)
    files.add(new Blob(['c']), 'retained.txt')
    files.removeAll()
    expect(files.state.files).toEqual([])
    expect(files.retainedBytes()).toBe(0)
    expect(revoke).toHaveBeenCalledTimes(3)
  })
  it('should save retained files without removing them and ignore deleted files', () => {
    const {files} = prepare()
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    files.add(new Blob(['a']), 'notes.txt')
    const id = files.state.files[0].id
    files.save(id)
    expect(files.state.files[0].saved).toBe(true)
    expect(files.retainedBytes()).toBe(1)
    files.remove(id)
    files.save(id)
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })
})

describe('ZIP saving', () => {
  it('should archive retained contents, preserve duplicate names and exclude deleted files', async () => {
    const blobs: Array<Blob> = []
    vi.stubGlobal('Blob', NodeBlob)
    vi.stubGlobal('URL', {
      createObjectURL: (blob: Blob) => {
        blobs.push(blob)
        return `blob:${blobs.length}`
      },
      revokeObjectURL: vi.fn(),
    })
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    const files = createReceivedFiles(100)
    files.add(new Blob(['first']), 'same.txt')
    files.add(new Blob(['second']), 'same.txt')
    files.add(new Blob(['removed']), 'deleted.txt')
    files.remove(files.state.files[2].id)
    await files.saveAll()
    expect(files.state.error).toBe(false)
    const archive = unzipSync(new Uint8Array(await blobs[3].arrayBuffer()))
    expect(Object.keys(archive)).toEqual(['same.txt', '1-same.txt'])
    expect(new TextDecoder().decode(archive['same.txt'])).toBe('first')
    expect(new TextDecoder().decode(archive['1-same.txt'])).toBe('second')
    expect(files.state.files.map((file) => file.saved)).toEqual([true, true])
    expect(click).toHaveBeenCalledTimes(1)
    click.mockRestore()
  })
})
