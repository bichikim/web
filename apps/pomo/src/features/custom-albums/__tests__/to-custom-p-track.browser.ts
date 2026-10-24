import {afterEach, expect, it} from 'vitest'

import {
  refreshCustomTrackObjectUrls,
  revokeCustomTrackObjectUrls,
  toCustomPTrack,
} from '../to-custom-p-track'

const id = 'custom-track:native-cache'
const audio = (value: string) => new Blob([value], {type: 'audio/mpeg'})
const track = (value: Blob) => ({
  albumId: 'custom-album:native-cache',
  artist: 'Artist',
  audio: value,
  durationSeconds: 1,
  fileName: 'song.mp3',
  id,
  title: 'Song',
})
const read = (url: string) => fetch(url).then((response) => response.text())

afterEach(() => revokeCustomTrackObjectUrls(new Set([id])))

it('should read replacement bytes and release the former native URL only after refreshing playback', async () => {
  const original = toCustomPTrack(track(audio('audio-a')))
  await refreshCustomTrackObjectUrls([track(audio('audio-b'))])
  expect(await read(original.source)).toBe('audio-a')
  const replacement = toCustomPTrack(track(audio('audio-b')))
  expect(await read(replacement.source)).toBe('audio-b')
  await expect(fetch(original.source)).rejects.toThrow()
  expect(toCustomPTrack(track(audio('audio-b'))).source).toBe(replacement.source)
})

it('should preserve the native playing URL when metadata saves contain a cloned unchanged Blob', async () => {
  const initial = audio('audio-a')
  const original = toCustomPTrack(track(initial))
  await refreshCustomTrackObjectUrls([track(structuredClone(initial))])
  const renamed = toCustomPTrack({...track(structuredClone(initial)), title: 'Renamed'})
  expect(renamed.source).toBe(original.source)
  expect(await read(original.source)).toBe('audio-a')
})
