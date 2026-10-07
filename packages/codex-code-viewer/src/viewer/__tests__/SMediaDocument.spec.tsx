/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import type {CodeDocument} from '../../shared/contracts'
import {SMediaDocument} from '../SMediaDocument'
import type {ViewerPort} from '../types'

describe('SMediaDocument', () => {
  const document: CodeDocument = {
    lines: [[]],
    location: {column: 1, line: 1, path: 'sample.mp3'},
    media: {kind: 'audio', mimeType: 'audio/mpeg', size: 4},
    revision: 'audio-first',
    source: '',
  }
  const port: ViewerPort = {
    call: vi.fn().mockResolvedValue({content: [], structuredContent: {data: 'AAECAw==', next: 4}}),
    context: vi.fn(),
    start: vi.fn(),
  }
  beforeEach(() => {
    vi.stubGlobal('URL', {
      createObjectURL: vi.fn(() => 'blob:audio-preview'),
      revokeObjectURL: vi.fn(),
    })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => {})
  })
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  it('should render audio playback controls without autoplay and stop on unmount', async () => {
    const view = render(() => <SMediaDocument document={document} port={port} session="session" />)
    const player = await screen.findByLabelText<HTMLAudioElement>('sample.mp3')
    expect(player.tagName).toBe('AUDIO')
    expect(player.src).toBe('blob:audio-preview')
    expect(player.controls).toBe(true)
    expect(player.autoplay).toBe(false)
    expect(player.preload).toBe('metadata')
    expect(screen.queryByRole('button', {name: '화면에 맞춤'})).toBeNull()
    expect(URL.createObjectURL).toHaveBeenCalledWith(expect.objectContaining({type: 'audio/mpeg'}))
    view.unmount()
    expect(player.pause).toHaveBeenCalledOnce()
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:audio-preview')
  })
  it('should report unsupported audio decoding through the existing error callback', async () => {
    const onError = vi.fn()
    render(() => (
      <SMediaDocument document={document} port={port} session="session" onError={onError} />
    ))
    fireEvent.error(await screen.findByLabelText('sample.mp3'))
    expect(screen.getByRole('status').textContent).toContain('코덱')
    expect(screen.queryByLabelText('sample.mp3')).toBeNull()
    expect(onError).toHaveBeenCalledWith(expect.any(Error))
  })
})
