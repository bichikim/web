/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, expect, test, vi} from 'vitest'

import {createEmptyDocument} from '../../player'
import {useDocumentExport} from '../use-document-export'

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
