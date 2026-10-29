/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'

import {createEmptyDocument, type PuppetDocument} from '@winter-love/puppet/player'
import {useDocumentExport} from '../use-document-export'

const mocks = vi.hoisted(() => ({pack: vi.fn()}))
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
    expect(download.url()).toBe('blob:first')
    expect(revoke).not.toHaveBeenCalled()
    download.exportDocument()
    expect(revoke).toHaveBeenCalledExactlyOnceWith('blob:first')
    expect(download.url()).toBe('blob:second')
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
  const notice = vi.fn()
  let finish!: (document: PuppetDocument) => void
  mocks.pack.mockReturnValueOnce(
    new Promise<PuppetDocument>((resolve) => {
      finish = resolve
    }),
  )
  const pending = createRoot((dispose) => {
    const exporting = useDocumentExport(createEmptyDocument, () => false, notice)
    const pending = exporting.exportAtlasDocument()
    dispose()
    return pending
  })
  finish(createEmptyDocument())
  await pending
  expect(create).not.toHaveBeenCalled()
  expect(notice).toHaveBeenCalledTimes(1)
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
