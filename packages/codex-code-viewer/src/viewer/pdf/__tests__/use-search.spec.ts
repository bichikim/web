/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {waitFor} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {usePdfSearch} from '../use-search'
import type {PdfDocument} from '../types'

describe('usePdfSearch', () => {
  let dispose: (() => void) | undefined
  afterEach(() => dispose?.())
  const mount = (document: () => PdfDocument | null, turn = vi.fn()) =>
    createRoot((cleanup) => {
      dispose = cleanup
      return {search: usePdfSearch({document, turn}), turn}
    })
  const document = (texts: readonly string[]): PdfDocument => ({
    page: vi.fn(),
    pages: texts.length,
    text: vi.fn(async (number: number) => texts[number - 1] ?? ''),
  })
  it('should normalize a selected multiline phrase when opening search', () => {
    const file = document(['first second'])
    const {search} = mount(() => file)
    search.open('first\n  second')
    expect(search.query()).toBe('first second')
  })
  it('should search every page once and navigate across pages in both directions', async () => {
    const file = document(['Alpha beta', 'alpha\nbeta alpha beta'])
    const {search, turn} = mount(() => file)
    search.open()
    search.change('alpha beta')
    await waitFor(() => expect(search.matches()).toHaveLength(3))
    expect(search.current()?.page).toBe(1)
    search.move(1)
    expect(search.current()?.page).toBe(2)
    expect(turn).toHaveBeenLastCalledWith(2)
    search.move(-1)
    search.move(-1)
    expect(search.active()).toBe(2)
    search.change('beta')
    search.close()
    search.open()
    expect(file.text).toHaveBeenCalledTimes(2)
  })
  it('should discard a departed document while text extraction is pending', async () => {
    const deferred = Promise.withResolvers<string>()
    const first = {...document(['old']), text: vi.fn(() => deferred.promise)}
    const [file, setFile] = createSignal<PdfDocument>(first)
    const {search} = mount(file)
    search.open()
    search.change('new')
    setFile(document(['new']))
    await waitFor(() => expect(search.matches()).toHaveLength(1))
    deferred.resolve('new new')
    await deferred.promise
    expect(search.matches()).toHaveLength(1)
  })
  it('should stop extracting at the character limit and disclose partial search', async () => {
    const text = vi.fn().mockResolvedValue('x'.repeat(4194304))
    const file = {...document(['', '']), text}
    const {search} = mount(() => file)
    search.open()
    await waitFor(() => expect(search.pending()).toBe(false))
    expect(search.status()).toContain('앞부분만 검색')
    expect(text).toHaveBeenCalledTimes(1)
  })
  it('should bound very frequent search matches and disclose the result limit', async () => {
    const file = document(['x'.repeat(10002), 'x'])
    const {search} = mount(() => file)
    search.open()
    search.change('x')
    await waitFor(() => expect(search.matches()).toHaveLength(10000))
    expect(search.status()).toContain('10,000개')
  })
  it('should distinguish image-only pages and failed extraction', async () => {
    const [file, setFile] = createSignal(document(['']))
    const {search} = mount(file)
    search.open()
    await waitFor(() => expect(search.status()).toContain('검색 가능한 텍스트가 없습니다'))
    setFile({...document(['one']), text: vi.fn().mockRejectedValue(new Error('failed'))})
    await waitFor(() => expect(search.status()).toContain('텍스트를 읽을 수 없습니다'))
  })
})
