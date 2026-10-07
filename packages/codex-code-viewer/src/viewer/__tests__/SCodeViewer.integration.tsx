/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {SCodeViewer} from '../SCodeViewer'
import type {ViewerPort} from '../types'

describe('SCodeViewer media lifecycle', () => {
  const originalScroll = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollIntoView')
  beforeEach(() => {
    Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
      configurable: true,
      value: vi.fn(),
    })
  })
  afterEach(() => {
    cleanup()
    vi.unstubAllGlobals()
    if (originalScroll === undefined) {
      Reflect.deleteProperty(HTMLElement.prototype, 'scrollIntoView')
    } else {
      Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', originalScroll)
    }
  })
  it('should reuse media on same-session navigation and reload after a session change', async () => {
    vi.stubGlobal('URL', {createObjectURL: vi.fn(() => 'blob:preview'), revokeObjectURL: vi.fn()})
    const port: ViewerPort = {
      call: vi
        .fn()
        .mockResolvedValue({content: [], structuredContent: {data: 'AAECAw==', next: 4}}),
      context: vi.fn(),
      start: vi.fn<ViewerPort['start']>().mockResolvedValue(() => {}),
    }
    render(() => <SCodeViewer port={port} />)
    const receive = vi.mocked(port.start).mock.calls[0]![0]
    const image = {
      document: {
        lines: [[]],
        location: {column: 1, line: 1, path: 'sample.png'},
        media: {kind: 'image' as const, mimeType: 'image/png', size: 4},
        revision: 'first',
        source: '',
      },
      session: 'session',
      workspace: '/project',
    }
    receive(image)
    await screen.findByRole('img', {name: 'sample.png'})
    receive({
      ...image,
      document: {
        lines: [[{kind: 'plain', navigation: null, offset: 0, text: 'text'}]],
        location: {column: 1, line: 1, path: 'notes.txt'},
        revision: 'text',
        source: 'text',
      },
    })
    expect(URL.revokeObjectURL).toHaveBeenCalledOnce()
    receive(image)
    await screen.findByRole('img', {name: 'sample.png'})
    expect(vi.mocked(port.call).mock.calls.filter(([name]) => name === 'code.media')).toHaveLength(
      1,
    )
    receive({...image, session: 'new-session'})
    await screen.findByRole('img', {name: 'sample.png'})
    expect(vi.mocked(port.call).mock.calls.filter(([name]) => name === 'code.media')).toHaveLength(
      2,
    )
    cleanup()
    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(3)
  })
})
