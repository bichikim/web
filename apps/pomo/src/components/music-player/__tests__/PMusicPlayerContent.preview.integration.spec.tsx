/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import {PAlbumLibrary} from '../../PAlbumLibrary'
import {PMusicPlayerContent} from '../PMusicPlayerContent'
import {AlbumLibraryFixture} from './test-support/AlbumLibraryFixture'
import {getAudioElement, TRACKS} from './test-support/player-fixtures'

const albumPreviewMocks = vi.hoisted(() => ({stop: vi.fn()}))

vi.mock('media-chrome', () => ({}))
vi.mock('../../PAlbumLibrary', () => ({PAlbumLibrary: vi.fn()}))

describe('PMusicPlayerContent preview integration', () => {
  beforeEach(() => {
    vi.mocked(PAlbumLibrary).mockImplementation((props) => (
      <AlbumLibraryFixture {...props} stopPreview={albumPreviewMocks.stop} />
    ))
    albumPreviewMocks.stop.mockReset()
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue()
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('should pause active playback for a preview and resume after it ends', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = getAudioElement(result.container)

    fireEvent(audio, new Event('play'))
    vi.mocked(HTMLMediaElement.prototype.pause).mockClear()
    vi.mocked(HTMLMediaElement.prototype.play).mockClear()
    fireEvent.click(screen.getByRole('button', {name: '미리듣기 시작'}))

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalledOnce()

    fireEvent(audio, new Event('pause'))
    fireEvent.click(screen.getByRole('button', {name: '미리듣기 종료'}))

    expect(HTMLMediaElement.prototype.play).toHaveBeenCalledOnce()
  })

  it('should stop an active preview when the main player starts', () => {
    const result = render(() => <PMusicPlayerContent tracks={TRACKS} />)
    const audio = getAudioElement(result.container)

    fireEvent.click(screen.getByRole('button', {name: '미리듣기 시작'}))
    fireEvent(audio, new Event('play'))

    expect(albumPreviewMocks.stop).toHaveBeenCalledOnce()
  })
})
