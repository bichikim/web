/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'

import {createEmptyDocument, type PuppetDocument} from '@winter-love/puppet/player'
import {useDocumentExport} from '../use-document-export'

const mocks = vi.hoisted(() => ({compress: vi.fn(), pack: vi.fn()}))
vi.mock('@winter-love/puppet/player', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@winter-love/puppet/player')>()),
  serializePoffoDocument: mocks.compress,
}))
vi.mock('@winter-love/puppet/editor', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@winter-love/puppet/editor')>()),
  packTextureAtlas: mocks.pack,
}))

afterEach(() => vi.restoreAllMocks())

test('should retain the download URL until replacement or editor disposal', () => {
  const create = vi
    .spyOn(URL, 'createObjectURL')
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:second')
  const revoke = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  createRoot((dispose) => {
    const download = useDocumentExport(createEmptyDocument)
    download.exportDocument()
    expect(revoke).not.toHaveBeenCalled()
    download.exportDocument()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:first')
    dispose()
    expect(revoke).toHaveBeenLastCalledWith('blob:second')
  })
  expect(create).toHaveBeenCalledTimes(2)
  expect(click).toHaveBeenCalledTimes(2)
})

test('should notify omitted temporary changes while still downloading the committed document', async () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:committed')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  const document = createEmptyDocument()
  const blob = createRoot((dispose) => {
    const [pending, setPending] = createSignal(true)
    const download = useDocumentExport(() => document, pending)
    download.exportDocument()
    expect(download.omitsTemporary()).toBe(true)
    const exported = create.mock.calls.at(-1)![0] as Blob
    download.dismissNotice()
    expect(download.omitsTemporary()).toBe(false)
    setPending(false)
    download.exportDocument()
    expect(download.omitsTemporary()).toBe(false)
    dispose()
    return exported
  })
  const source = await new Promise<string>((resolve) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.readAsText(blob)
  })
  expect(JSON.parse(source)).toEqual(document)
  expect(click).toHaveBeenCalledTimes(2)
})

test('should not download or notify after pending atlas export is disposed', async () => {
  const create = vi.spyOn(URL, 'createObjectURL')
  let finish!: (document: PuppetDocument) => void
  mocks.pack.mockReturnValueOnce(
    new Promise<PuppetDocument>((resolve) => {
      finish = resolve
    }),
  )
  const {pending, exporting} = createRoot((dispose) => {
    const exporting = useDocumentExport(createEmptyDocument)
    const pending = exporting.exportAtlasDocument()
    dispose()
    return {exporting, pending}
  })
  finish(createEmptyDocument())
  await pending
  expect(create).not.toHaveBeenCalled()
  expect(exporting.notice()).toBe('텍스처 아틀라스를 만드는 중입니다.')
})

test('should download JSON even when whole-document stringification is unavailable', async () => {
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:chunked')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  const stringify = JSON.stringify
  vi.spyOn(JSON, 'stringify').mockImplementation((value, replacer, space) => {
    if (typeof value === 'object' && value !== null) {
      throw new RangeError('Invalid string length')
    }
    return stringify(value, replacer, space)
  })
  const document = createEmptyDocument()
  createRoot((dispose) => {
    useDocumentExport(() => document).exportDocument()
    dispose()
  })
  const blob = create.mock.calls[0]![0] as Blob
  const json = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
  expect(JSON.parse(json)).toEqual(document)
})

test('should download compressed bytes with the matching filename', async () => {
  const blob = new Blob(['compressed'], {type: 'application/vnd.poffo'})
  mocks.compress.mockResolvedValueOnce(blob)
  const create = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:compressed')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const names: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function click(this: HTMLAnchorElement) {
      names.push(this.download)
    },
  )
  let dispose!: () => void
  const exporting = createRoot((cleanup) => {
    dispose = cleanup
    return useDocumentExport(createEmptyDocument)
  })
  await exporting.exportPoffoDocument()
  expect(create).toHaveBeenCalledWith(blob)
  expect(names).toEqual(['puppet-model.poffo'])
  expect(exporting.pending()).toBeNull()
  dispose()
})

test('should discard cancelled output even if the compressor resolves after cancellation', async () => {
  let finish!: (blob: Blob) => void
  mocks.compress.mockReturnValueOnce(
    new Promise<Blob>((resolve) => {
      finish = resolve
    }),
  )
  const create = vi.spyOn(URL, 'createObjectURL')
  let dispose!: () => void
  const exporting = createRoot((cleanup) => {
    dispose = cleanup
    return useDocumentExport(createEmptyDocument)
  })
  const pending = exporting.exportPoffoDocument()
  expect(exporting.pending()).not.toBeNull()
  exporting.cancelExport()
  finish(new Blob(['late']))
  await pending
  expect(create).not.toHaveBeenCalled()
  expect(exporting.notice()).toBeNull()
  expect(exporting.pending()).toBeNull()
  dispose()
})

test('should not let an older atlas completion cancel a newer Poffo export', async () => {
  let finishAtlas!: (value: PuppetDocument) => void
  const atlas = new Promise<PuppetDocument>((resolve) => {
    finishAtlas = resolve
  })
  let finishNative!: (value: Blob) => void
  const native = new Promise<Blob>((resolve) => {
    finishNative = resolve
  })
  mocks.pack.mockReturnValueOnce(atlas)
  mocks.compress.mockReturnValueOnce(native)
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:download')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const names: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function click(this: HTMLAnchorElement) {
      names.push(this.download)
    },
  )
  let dispose!: () => void
  const exporting = createRoot((cleanup) => {
    dispose = cleanup
    return useDocumentExport(createEmptyDocument)
  })
  const earlier = exporting.exportAtlasDocument()
  const latest = exporting.exportPoffoDocument()
  const signal = mocks.compress.mock.calls.at(-1)![1].signal as AbortSignal
  try {
    finishAtlas(createEmptyDocument())
    await earlier
    expect(signal.aborted).toBe(false)
    expect(exporting.pending()).toBe('puppet-model.poffo')
    finishNative(new Blob(['native']))
    await latest
    expect(names).toEqual(['puppet-model.json', 'puppet-model.poffo'])
  } finally {
    finishNative(new Blob(['native']))
    await latest
    dispose()
  }
})

test.each(['success', 'failure'])(
  'should retain a newer Poffo failure notice after an older atlas %s',
  async (outcome) => {
    let finish!: () => void
    mocks.pack.mockReturnValueOnce(
      new Promise<PuppetDocument>((resolve, reject) => {
        finish = () =>
          outcome === 'success'
            ? resolve(createEmptyDocument())
            : reject(new Error('old atlas failure'))
      }),
    )
    mocks.compress.mockRejectedValueOnce(new Error('native failure'))
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:atlas')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    let dispose!: () => void
    const exporting = createRoot((cleanup) => {
      dispose = cleanup
      return useDocumentExport(createEmptyDocument)
    })
    const earlier = exporting.exportAtlasDocument()
    try {
      await exporting.exportPoffoDocument()
      expect(exporting.notice()).toBe('문서를 저장하지 못했습니다.')
      finish()
      await earlier
      expect(exporting.notice()).toBe('문서를 저장하지 못했습니다.')
    } finally {
      finish()
      await earlier
      dispose()
    }
  },
)

test('should cancel a pending Poffo export when JSON is explicitly requested', async () => {
  let finish!: (value: Blob) => void
  mocks.compress.mockReturnValueOnce(
    new Promise<Blob>((resolve) => {
      finish = resolve
    }),
  )
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:json')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const names: string[] = []
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(
    function click(this: HTMLAnchorElement) {
      names.push(this.download)
    },
  )
  let dispose!: () => void
  const exporting = createRoot((cleanup) => {
    dispose = cleanup
    return useDocumentExport(createEmptyDocument)
  })
  const pending = exporting.exportPoffoDocument()
  const signal = mocks.compress.mock.calls.at(-1)![1].signal as AbortSignal
  exporting.exportDocument()
  finish(new Blob(['late native']))
  await pending
  expect(signal.aborted).toBe(true)
  expect(names).toEqual(['puppet-model.json'])
  dispose()
})

test('should not download or notify when JSON is requested after disposal', () => {
  const create = vi.spyOn(URL, 'createObjectURL')
  const exporting = createRoot((dispose) => {
    const exporting = useDocumentExport(createEmptyDocument)
    dispose()
    return exporting
  })
  exporting.exportDocument()
  expect(create).not.toHaveBeenCalled()
  expect(exporting.notice()).toBeNull()
})

test.each(['success', 'failure'])(
  'should publish the current atlas %s without a newer export',
  async (outcome) => {
    if (outcome === 'success') {
      mocks.pack.mockResolvedValueOnce(createEmptyDocument())
    } else {
      mocks.pack.mockRejectedValueOnce(new Error('atlas failed'))
    }
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:atlas')
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
    let dispose!: () => void
    const exporting = createRoot((cleanup) => {
      dispose = cleanup
      return useDocumentExport(createEmptyDocument)
    })
    await exporting.exportAtlasDocument()
    expect(exporting.notice()).toBe(
      outcome === 'success' ? null : '텍스처 아틀라스를 만들지 못했습니다.',
    )
    expect(click).toHaveBeenCalledTimes(outcome === 'success' ? 1 : 0)
    dispose()
  },
)

test('should dismiss both a failure notice and omitted-change feedback', async () => {
  vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:json')
  vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => undefined)
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  mocks.compress.mockRejectedValueOnce(new Error('failed'))
  let dispose!: () => void
  const exporting = createRoot((cleanup) => {
    dispose = cleanup
    return useDocumentExport(createEmptyDocument, () => true)
  })
  exporting.exportDocument()
  await exporting.exportPoffoDocument()
  expect(exporting.notice()).toBe('문서를 저장하지 못했습니다.')
  expect(exporting.omitsTemporary()).toBe(true)
  exporting.dismissNotice()
  expect(exporting.notice()).toBeNull()
  expect(exporting.omitsTemporary()).toBe(false)
  dispose()
})

test('should abort on disposal and ignore a late Poffo export failure', async () => {
  let fail!: (reason: Error) => void
  mocks.compress.mockReturnValueOnce(
    new Promise<Blob>((_, reject) => {
      fail = reject
    }),
  )
  const create = vi.spyOn(URL, 'createObjectURL')
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  let dispose!: () => void
  const exporting = createRoot((cleanup) => {
    dispose = cleanup
    return useDocumentExport(createEmptyDocument)
  })
  const pending = exporting.exportPoffoDocument()
  const signal = mocks.compress.mock.calls.at(-1)![1].signal as AbortSignal
  dispose()
  fail(new Error('late export failure'))
  await pending
  expect(signal.aborted).toBe(true)
  expect(exporting.notice()).toBeNull()
  expect(exporting.pending()).toBeNull()
  expect(create).not.toHaveBeenCalled()
  expect(warn).not.toHaveBeenCalled()
})
