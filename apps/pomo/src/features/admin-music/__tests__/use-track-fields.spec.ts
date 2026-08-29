/** @vitest-environment jsdom */

import {renderHook, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

const metadataMocks = vi.hoisted(() => ({readTrackMetadata: vi.fn()}))

vi.mock('../track-metadata', () => metadataMocks)

import {useTrackFields} from '../use-track-fields'

const AUDIO_FILE = new File(['audio'], 'track.mp3', {type: 'audio/mpeg'})

const createDeferred = <Value>() => {
  let rejectPromise: (error: Error) => void = () => undefined
  let resolvePromise: (value: Value) => void = () => undefined
  const promise = new Promise<Value>((resolve, reject) => {
    rejectPromise = reject
    resolvePromise = resolve
  })

  return {promise, rejectPromise, resolvePromise}
}

const renderTrackFields = () => {
  const onArtistChange = vi.fn()
  const onTitleChange = vi.fn()
  const [resetVersion, setResetVersion] = createSignal(0)
  const hook = renderHook(() =>
    useTrackFields({
      onArtistChange,
      onTitleChange,
      get resetVersion() {
        return resetVersion()
      },
    }),
  )

  return {...hook, onArtistChange, onTitleChange, setResetVersion}
}

beforeEach(() => {
  vi.resetAllMocks()
})

afterEach(() => {
  vi.clearAllMocks()
})

describe('useTrackFields', () => {
  it('should expose metadata defaults and ignore an absent audio file', async () => {
    const {cleanup, result} = renderTrackFields()

    expect(result.metadataMessage()).toBeNull()
    expect(result.useMetadata()).toBe(true)
    await result.onAudioFileChange(undefined)
    await result.onMetadataToggle(true, undefined)

    expect(metadataMocks.readTrackMetadata).not.toHaveBeenCalled()
    cleanup()
  })

  it('should apply a selected MP3 title and artist', async () => {
    metadataMocks.readTrackMetadata.mockResolvedValue({artist: '태그 아티스트', title: '태그 제목'})
    const {cleanup, onArtistChange, onTitleChange, result} = renderTrackFields()

    await result.onAudioFileChange(AUDIO_FILE)

    expect(onTitleChange).toHaveBeenCalledWith('태그 제목')
    expect(onArtistChange).toHaveBeenCalledWith('태그 아티스트')
    expect(result.metadataMessage()).toBe('MP3의 제목과 아티스트를 적용했습니다.')
    cleanup()
  })

  it('should report absent metadata without changing fields', async () => {
    metadataMocks.readTrackMetadata.mockResolvedValue({artist: null, title: null})
    const {cleanup, onArtistChange, onTitleChange, result} = renderTrackFields()

    await result.onAudioFileChange(AUDIO_FILE)

    expect(onTitleChange).not.toHaveBeenCalled()
    expect(onArtistChange).not.toHaveBeenCalled()
    expect(result.metadataMessage()).toBe('MP3에 제목과 아티스트 정보가 없습니다.')
    cleanup()
  })

  it('should apply available artist-only metadata when re-enabled with an audio file', async () => {
    metadataMocks.readTrackMetadata.mockResolvedValue({artist: '태그 아티스트', title: null})
    const {cleanup, onArtistChange, onTitleChange, result} = renderTrackFields()

    await result.onMetadataToggle(false, AUDIO_FILE)

    expect(result.useMetadata()).toBe(false)
    expect(result.metadataMessage()).toBeNull()
    expect(metadataMocks.readTrackMetadata).not.toHaveBeenCalled()

    await result.onMetadataToggle(true, AUDIO_FILE)

    expect(onTitleChange).not.toHaveBeenCalled()
    expect(onArtistChange).toHaveBeenCalledWith('태그 아티스트')
    expect(result.metadataMessage()).toBe('MP3의 제목과 아티스트를 적용했습니다.')
    cleanup()
  })

  it('should report a metadata reading failure', async () => {
    metadataMocks.readTrackMetadata.mockRejectedValue(new Error('invalid mp3'))
    const {cleanup, result} = renderTrackFields()

    await result.onAudioFileChange(AUDIO_FILE)

    expect(result.metadataMessage()).toBe('MP3 정보를 읽지 못했습니다. 직접 입력해 주세요.')
    cleanup()
  })

  it('should ignore a metadata read resolved after metadata use is disabled', async () => {
    const deferred = createDeferred<{readonly artist: string; readonly title: string}>()
    metadataMocks.readTrackMetadata.mockReturnValue(deferred.promise)
    const {cleanup, onArtistChange, onTitleChange, result} = renderTrackFields()

    const read = result.onAudioFileChange(AUDIO_FILE)

    expect(result.metadataMessage()).toBe('MP3 정보를 읽는 중…')
    await result.onMetadataToggle(false, AUDIO_FILE)
    deferred.resolvePromise({artist: '늦은 아티스트', title: '늦은 제목'})
    await read

    expect(onTitleChange).not.toHaveBeenCalled()
    expect(onArtistChange).not.toHaveBeenCalled()
    expect(result.metadataMessage()).toBeNull()
    cleanup()
  })

  it('should reset metadata state when the reset version changes', async () => {
    metadataMocks.readTrackMetadata.mockResolvedValue({artist: '태그 아티스트', title: '태그 제목'})
    const {cleanup, result, setResetVersion} = renderTrackFields()

    await result.onAudioFileChange(AUDIO_FILE)
    setResetVersion((version) => version + 1)

    await waitFor(() => expect(result.useMetadata()).toBe(true))
    expect(result.metadataMessage()).toBeNull()
    cleanup()
  })

  it('should ignore a metadata reading failure after a reset', async () => {
    const deferred = createDeferred<never>()
    metadataMocks.readTrackMetadata.mockReturnValue(deferred.promise)
    const {cleanup, result, setResetVersion} = renderTrackFields()

    const read = result.onAudioFileChange(AUDIO_FILE)

    setResetVersion((version) => version + 1)
    await waitFor(() => expect(result.metadataMessage()).toBeNull())
    deferred.rejectPromise(new Error('late failure'))
    await read

    expect(result.metadataMessage()).toBeNull()
    cleanup()
  })
})
