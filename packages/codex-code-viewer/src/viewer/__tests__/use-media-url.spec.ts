/** @vitest-environment jsdom */
import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CodeDocument} from '../../shared/contracts'
import type {ViewerPort} from '../types'
import {useMediaUrl} from '../use-media-url'

describe('useMediaUrl', () => {
  let dispose: () => void
  const document: CodeDocument = {
    lines: [[]],
    location: {column: 1, line: 1, path: 'sample.png'},
    media: {kind: 'image', mimeType: 'image/png', size: 4},
    revision: 'first',
    source: '',
  }
  beforeEach(() => {
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn()})
  })
  afterEach(() => {
    dispose?.()
    vi.unstubAllGlobals()
  })
  const port = (): ViewerPort => ({
    call: vi.fn().mockResolvedValue({content: [], structuredContent: {data: 'AAECAw==', next: 4}}),
    context: vi.fn(),
    start: vi.fn(),
  })
  it('should assemble chunks and revoke the URL when disposed', async () => {
    const host = port()
    const media = createRoot((cleanup) => {
      dispose = cleanup
      return useMediaUrl({document: () => document, port: () => host, session: () => 'session'})
    })
    await vi.waitFor(() => expect(media.url()).toBe('blob:preview'))
    expect(host.call).toHaveBeenCalledWith('code.media', {
      offset: 0,
      path: 'sample.png',
      revision: 'first',
      session: 'session',
    })
    expect(media.progress()).toBe(100)
    dispose()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:preview')
  })
  it('should discard a chunk after navigation changes the document', async () => {
    let resolve: (value: Awaited<ReturnType<ViewerPort['call']>>) => void = () => {}
    const host = port()
    vi.mocked(host.call).mockReturnValue(
      new Promise((complete) => {
        resolve = complete
      }),
    )
    const [current, setCurrent] = createSignal<CodeDocument | undefined>(document)
    const media = createRoot((cleanup) => {
      dispose = cleanup
      return useMediaUrl({document: current, port: () => host, session: () => 'session'})
    })
    setCurrent(undefined)
    resolve({content: [], structuredContent: {data: 'AAECAw==', next: 4}})
    await Promise.resolve()
    await Promise.resolve()
    expect(media.url()).toBeUndefined()
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
  it('should report corrupt chunks instead of continuing to request them', async () => {
    const host = port()
    vi.mocked(host.call).mockResolvedValue({
      content: [],
      structuredContent: {data: 'AA==', next: 4},
    })
    const media = createRoot((cleanup) => {
      dispose = cleanup
      return useMediaUrl({document: () => document, port: () => host, session: () => 'session'})
    })
    await vi.waitFor(() => expect(media.error()).toBe('미디어 데이터를 읽지 못했습니다.'))
    expect(host.call).toHaveBeenCalledTimes(1)
    expect(URL.createObjectURL).not.toHaveBeenCalled()
  })
})
