/** @vitest-environment jsdom */
import {createRoot} from 'solid-js'
import {expect, test, vi} from 'vitest'

import {createEmptyDocument} from '../../player'
import {useDocumentExport} from '../use-document-export'

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
