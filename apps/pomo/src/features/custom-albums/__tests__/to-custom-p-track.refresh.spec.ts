/** @vitest-environment node */
import {afterEach, expect, it, vi} from 'vitest'
import type {StoredCustomTrack} from '../database'
import {
  refreshCustomTrackObjectUrls,
  retryCustomTrackObjectUrls,
  revokeCustomTrackObjectUrls,
  toCustomPTrack,
} from '../to-custom-p-track'

const id = 'custom-track:refresh'
const otherId = 'custom-track:other'
const track = (audio: Blob, trackId = id): StoredCustomTrack => ({
  albumId: 'custom-album:refresh',
  artist: '',
  audio,
  durationSeconds: 1,
  fileName: 'song.mp3',
  id: trackId,
  title: 'Song',
})
const blob = (text: string) => new Blob([text], {type: 'audio/mpeg'})
const text = (source: string) => fetch(source).then((response) => response.text())
const deferRead = (audio: Blob) => {
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  const original = audio.slice.bind(audio)
  vi.spyOn(audio, 'slice').mockImplementation((...args) => {
    const part = original(...args)
    return {
      arrayBuffer: async () => {
        entered.resolve()
        await release.promise
        return part.arrayBuffer()
      },
    } as Blob
  })
  return {entered: entered.promise, release: () => release.resolve()}
}

afterEach(() => {
  vi.restoreAllMocks()
  revokeCustomTrackObjectUrls(new Set([id, otherId]))
})

it('should lazily replace changed audio without revoking the playing URL before its next read', async () => {
  const first = toCustomPTrack(track(blob('audio-a')))
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  expect(await text(first.source)).toBe('audio-a')
  const second = toCustomPTrack(track(blob('audio-b')))
  expect(await text(second.source)).toBe('audio-b')
  await expect(fetch(first.source)).rejects.toThrow()
  expect(toCustomPTrack(track(blob('audio-b'))).source).toBe(second.source)
})

it('should retain the playing URL when an IndexedDB-style clone contains identical bytes', async () => {
  const audio = blob('same-audio')
  const first = toCustomPTrack(track(audio))
  await refreshCustomTrackObjectUrls([track(structuredClone(audio))])
  expect(toCustomPTrack({...track(structuredClone(audio)), title: 'Renamed'}).source).toBe(
    first.source,
  )
  expect(await text(first.source)).toBe('same-audio')
})

it('should preserve another album track URL during a replacement', async () => {
  toCustomPTrack(track(blob('audio-a')))
  const other = toCustomPTrack(track(blob('other'), otherId))
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  expect(toCustomPTrack(track(blob('other'), otherId)).source).toBe(other.source)
})

it('should ignore an older comparison that completes after a newer committed save', async () => {
  const original = blob('audio-a')
  toCustomPTrack(track(original))
  const gate = deferRead(original)
  const older = refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  await gate.entered
  const newer = refreshCustomTrackObjectUrls([track(blob('audio-c'))])
  gate.release()
  await Promise.all([older, newer])
  expect(await text(toCustomPTrack(track(blob('audio-c'))).source)).toBe('audio-c')
})

it('should recompare a refreshed source instead of revoking an equal newly playing URL', async () => {
  const original = blob('audio-a')
  toCustomPTrack(track(original))
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  const gate = deferRead(original)
  const metadataSave = refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  await gate.entered
  const playing = toCustomPTrack(track(blob('audio-b')))
  gate.release()
  await metadataSave
  expect(toCustomPTrack(track(blob('audio-b'))).source).toBe(playing.source)
  expect(await text(playing.source)).toBe('audio-b')
})

it('should not overwrite a deleted and recreated cache entry with a late comparison', async () => {
  const original = blob('audio-a')
  toCustomPTrack(track(original))
  const gate = deferRead(original)
  const pending = refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  await gate.entered
  revokeCustomTrackObjectUrls(new Set([id]))
  const recreated = toCustomPTrack(track(blob('audio-c')))
  gate.release()
  await pending
  expect(toCustomPTrack(track(blob('audio-c'))).source).toBe(recreated.source)
})

it('should keep the old URL when replacement creation fails and retry on a later read', async () => {
  const first = toCustomPTrack(track(blob('audio-a')))
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementationOnce(() => {
    throw new Error('URL unavailable')
  })
  expect(() => toCustomPTrack(track(blob('audio-b')))).toThrow('URL unavailable')
  expect(await text(first.source)).toBe('audio-a')
  create.mockRestore()
  expect(await text(toCustomPTrack(track(blob('audio-b'))).source)).toBe('audio-b')
})

it('should surface comparison failure at playback and retry without falsely rejecting the durable save', async () => {
  const original = blob('audio-a')
  const first = toCustomPTrack(track(original))
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    throw new Error('Blob read failed')
  })
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  expect(await text(first.source)).toBe('audio-a')
  expect(() => toCustomPTrack(track(blob('audio-b')))).toThrow('Blob read failed')
  await retryCustomTrackObjectUrls([track(blob('audio-b'))])
  expect(await text(toCustomPTrack(track(blob('audio-b'))).source)).toBe('audio-b')
})

it('should retain an identical playing URL after retrying a failed metadata comparison', async () => {
  const original = blob('audio-a')
  const first = toCustomPTrack(track(original))
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    throw new Error('Blob read failed')
  })
  await refreshCustomTrackObjectUrls([track(structuredClone(original))])
  expect(() => toCustomPTrack(track(original))).toThrow('Blob read failed')
  await retryCustomTrackObjectUrls([track(structuredClone(original))])
  expect(toCustomPTrack(track(original)).source).toBe(first.source)
})

it('should process later committed tracks even when the first comparison fails', async () => {
  const original = blob('audio-a')
  toCustomPTrack(track(original))
  toCustomPTrack(track(blob('other-a'), otherId))
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    throw new Error('Blob read failed')
  })
  await refreshCustomTrackObjectUrls([track(blob('audio-b')), track(blob('other-b'), otherId)])
  expect(() => toCustomPTrack(track(blob('audio-b')))).toThrow('Blob read failed')
  expect(await text(toCustomPTrack(track(blob('other-b'), otherId)).source)).toBe('other-b')
})

it('should not let an old reader retry supersede a newer committed audio update', async () => {
  const original = blob('audio-a')
  toCustomPTrack(track(original))
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    throw new Error('Blob read failed')
  })
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  vi.restoreAllMocks()
  const gate = deferRead(original)
  const newer = refreshCustomTrackObjectUrls([track(blob('audio-c'))])
  await gate.entered
  await retryCustomTrackObjectUrls([track(original)])
  gate.release()
  await newer
  expect(await text(toCustomPTrack(track(blob('audio-c'))).source)).toBe('audio-c')
})

it('should retry the failed committed audio rather than a stale reader snapshot', async () => {
  const original = blob('audio-a')
  toCustomPTrack(track(original))
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    throw new Error('Blob read failed')
  })
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  await retryCustomTrackObjectUrls([track(original)])
  expect(await text(toCustomPTrack(track(blob('audio-b'))).source)).toBe('audio-b')
})

it('should not restore a stale error after another reader refreshes the source successfully', async () => {
  const original = blob('audio-a')
  toCustomPTrack(track(original))
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    throw new Error('Initial read failed')
  })
  await refreshCustomTrackObjectUrls([track(blob('audio-b'))])
  vi.restoreAllMocks()
  const entered = Promise.withResolvers<void>()
  const release = Promise.withResolvers<void>()
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    const part = blob('audio-a')
    vi.spyOn(part, 'arrayBuffer').mockImplementation(async () => {
      entered.resolve()
      await release.promise
      throw new Error('Late old Blob failure')
    })
    return part
  })
  const firstRetry = retryCustomTrackObjectUrls([track(original)])
  await entered.promise
  await retryCustomTrackObjectUrls([track(original)])
  const refreshed = toCustomPTrack(track(blob('audio-b')))
  release.resolve()
  await firstRetry
  expect(toCustomPTrack(track(blob('audio-b'))).source).toBe(refreshed.source)
  expect(await text(refreshed.source)).toBe('audio-b')
})

it('should settle both chunk reads before comparing another track after one side fails', async () => {
  const original = blob('audio-a')
  const next = blob('audio-b')
  const other = blob('other-a')
  toCustomPTrack(track(original))
  toCustomPTrack(track(other, otherId))
  let firstReadPending = false
  let overlapped = false
  vi.spyOn(original, 'slice').mockImplementationOnce(() => {
    throw new Error('Chunk failed')
  })
  vi.spyOn(next, 'slice').mockImplementationOnce(
    () =>
      ({
        arrayBuffer: async () => {
          firstReadPending = true
          await Promise.resolve()
          await Promise.resolve()
          await Promise.resolve()
          await Promise.resolve()
          firstReadPending = false
          return new ArrayBuffer(0)
        },
      }) as Blob,
  )
  const slice = other.slice.bind(other)
  vi.spyOn(other, 'slice').mockImplementation((...args) => {
    overlapped ||= firstReadPending
    return slice(...args)
  })
  await refreshCustomTrackObjectUrls([track(next), track(blob('other-b'), otherId)])
  expect(overlapped).toBe(false)
  expect(await text(toCustomPTrack(track(blob('other-b'), otherId)).source)).toBe('other-b')
})
