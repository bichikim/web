/** @vitest-environment jsdom */
import {waitFor} from '@solidjs/testing-library'
import {createRoot, createSignal} from 'solid-js'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {usePageText} from '../use-page-text'
import type {PdfDocument, PdfPageText} from '../types'

const empty: PdfPageText = {offsets: [], runs: [], source: ''}
describe('usePageText', () => {
  let dispose: (() => void) | undefined
  afterEach(() => dispose?.())
  it('should discard late page text and only retain the currently viewed page', async () => {
    const old = Promise.withResolvers<PdfPageText>()
    const read = vi
      .fn()
      .mockImplementationOnce(() => old.promise)
      .mockResolvedValue({...empty, source: 'new'})
    const file: PdfDocument = {
      page: vi.fn().mockResolvedValue({text: read}),
      pages: 2,
      text: vi.fn(),
    }
    const [page, setPage] = createSignal(1)
    const text = createRoot((cleanup) => {
      dispose = cleanup
      return usePageText({document: () => file, page})
    })
    await Promise.resolve()
    setPage(2)
    await waitFor(() => expect(text.text()?.source).toBe('new'))
    old.resolve({...empty, source: 'old'})
    await old.promise
    expect(text.text()?.source).toBe('new')
  })
  it('should report a current text extraction failure', async () => {
    const cause = new Error('text extraction failed')
    const file: PdfDocument = {page: vi.fn().mockRejectedValue(cause), pages: 1, text: vi.fn()}
    const onError = vi.fn()
    const result = createRoot((cleanup) => {
      dispose = cleanup
      return usePageText({document: () => file, onError, page: () => 1})
    })
    await waitFor(() => expect(onError).toHaveBeenCalledWith(expect.objectContaining({cause})))
    expect(result.error()?.cause).toBe(cause)
    expect(result.text()).toBeNull()
  })
})
