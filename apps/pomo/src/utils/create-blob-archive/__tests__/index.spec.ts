// @vitest-environment node
import {unzipSync, Zip, ZipPassThrough} from 'fflate'
import {describe, expect, it, vi} from 'vitest'
import {createBlobArchive} from '..'

const readArchive = async (archive: Blob) => {
  const entries = unzipSync(new Uint8Array(await archive.arrayBuffer()))
  return Object.entries(entries).map(([name, bytes]) => [name, new TextDecoder().decode(bytes)])
}

describe('createBlobArchive', () => {
  it('should preserve ordered contents, verbatim names and collision chains', async () => {
    const names = ['same.txt', '1-same.txt', 'same.txt', 'same.txt', '../그림.txt', 'empty.txt']
    const archive = await createBlobArchive(
      names.map((name, index) => ({blob: new Blob([index === 5 ? '' : String(index)]), name})),
    )
    expect(archive.type).toBe('application/zip')
    expect(await readArchive(archive)).toEqual([
      ['same.txt', '0'],
      ['1-same.txt', '1'],
      ['2-same.txt', '2'],
      ['3-same.txt', '3'],
      ['../그림.txt', '4'],
      ['empty.txt', ''],
    ])
  })

  it('should produce an empty ZIP for an empty collection', async () => {
    const archive = await createBlobArchive([])
    expect(archive.type).toBe('application/zip')
    expect(await readArchive(archive)).toEqual([])
  })

  it('should consume all chunks of one stream before opening the next and release its lock', async () => {
    const first = new Blob()
    const second = new Blob(['second'])
    let finish!: () => void
    const barrier = new Promise<void>((resolve) => {
      finish = resolve
    })
    const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
      async start(controller) {
        controller.enqueue(new TextEncoder().encode('one'))
        await barrier
        controller.enqueue(new TextEncoder().encode('two'))
        controller.close()
      },
    })
    vi.spyOn(first, 'stream').mockReturnValue(stream)
    const next = vi.spyOn(second, 'stream')
    const result = createBlobArchive([
      {blob: first, name: 'first'},
      {blob: second, name: 'second'},
    ])
    expect(stream.locked).toBe(true)
    expect(next).not.toHaveBeenCalled()
    finish()
    const archive = await result
    expect(stream.locked).toBe(false)
    expect(await readArchive(archive)).toEqual([
      ['first', 'onetwo'],
      ['second', 'second'],
    ])
  })

  it('should propagate read errors, release the reader and leave later inputs unread', async () => {
    const error = new Error('read failed')
    const stream = new ReadableStream<Uint8Array<ArrayBuffer>>({
      start: (controller) => controller.error(error),
    })
    const first = new Blob()
    const second = new Blob()
    vi.spyOn(first, 'stream').mockReturnValue(stream)
    const next = vi.spyOn(second, 'stream')
    const failure = await createBlobArchive([
      {blob: first, name: 'first'},
      {blob: second, name: 'second'},
    ]).catch((reason: unknown) => reason)
    expect(failure).toBe(error)
    expect(stream.locked).toBe(false)
    expect(next).not.toHaveBeenCalled()
  })

  it('should release the reader when pushing a ZIP chunk fails', async () => {
    const error = new Error('encoding failed')
    const blob = new Blob(['content'])
    const stream = blob.stream()
    const later = new Blob()
    const next = vi.spyOn(later, 'stream')
    const end = vi.spyOn(Zip.prototype, 'end')
    vi.spyOn(blob, 'stream').mockReturnValue(stream)
    const push = vi.spyOn(ZipPassThrough.prototype, 'push').mockImplementation(() => {
      throw error
    })
    try {
      const failure = await createBlobArchive([
        {blob, name: 'file'},
        {blob: later, name: 'later'},
      ]).catch((reason: unknown) => reason)
      expect(failure).toBe(error)
      expect(stream.locked).toBe(false)
      expect(next).not.toHaveBeenCalled()
      expect(end).not.toHaveBeenCalled()
    } finally {
      push.mockRestore()
      end.mockRestore()
    }
  })

  it('should propagate finalization errors after releasing completed readers', async () => {
    const error = new Error('finalization failed')
    const blob = new Blob(['content'])
    const stream = blob.stream()
    vi.spyOn(blob, 'stream').mockReturnValue(stream)
    const end = vi.spyOn(Zip.prototype, 'end').mockImplementation(() => {
      throw error
    })
    try {
      const failure = await createBlobArchive([{blob, name: 'file'}]).catch(
        (reason: unknown) => reason,
      )
      expect(failure).toBe(error)
      expect(stream.locked).toBe(false)
      expect(end).toHaveBeenCalledTimes(1)
    } finally {
      end.mockRestore()
    }
  })

  it('should reject ZIP encoding failures before opening the Blob stream', async () => {
    const blob = new Blob()
    const open = vi.spyOn(blob, 'stream')
    const failure = await createBlobArchive([{blob, name: 'a'.repeat(65_536)}]).catch(
      (reason: unknown) => reason,
    )
    expect(failure).toBeInstanceOf(Error)
    expect(open).not.toHaveBeenCalled()
  })
})
