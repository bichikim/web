import {expect, test} from 'vitest'
import {parseLibrary} from '../parse-library'

const album = {
  artist: 'ASH',
  id: 'afternoon',
  title: '오후의 거리',
  tracks: [{id: 'window', src: '/music/ash/window.mp3', title: '창문'}],
}

test('should accept an empty album before audio files are registered', () => {
  const library = {albums: [{...album, tracks: []}], version: 1}
  expect(parseLibrary(library)).toEqual(library)
})

test('should retain album metadata and local audio sources', () => {
  const library = {albums: [album], version: 1}
  expect(parseLibrary(library)).toEqual(library)
})

test('should retain a track cover and artist while rejecting invalid cover paths', () => {
  const track = {...album.tracks[0], artist: 'rainymonday', artwork: '/music/ash/window/cover.webp'}
  const library = {albums: [{...album, tracks: [track]}], version: 1}
  expect(parseLibrary(library)).toEqual(library)
  expect(
    parseLibrary({
      albums: [{...album, tracks: [{...track, artwork: '/missing.webp'}]}],
      version: 1,
    }),
  ).toBeNull()
})

test('should reject malformed data and unsupported library versions', () => {
  expect(parseLibrary({albums: [album], version: 2})).toBeNull()
  expect(parseLibrary({albums: [{...album, tracks: [{title: '창문'}]}], version: 1})).toBeNull()
  expect(parseLibrary(null)).toBeNull()
})

test('should reject duplicate identifiers and sources outside public music', () => {
  expect(parseLibrary({albums: [album, album], version: 1})).toBeNull()
  expect(
    parseLibrary({albums: [{...album, tracks: [...album.tracks, ...album.tracks]}], version: 1}),
  ).toBeNull()
  const external = {...album.tracks[0], src: 'https://example.com/song.mp3'}
  expect(parseLibrary({albums: [{...album, tracks: [external]}], version: 1})).toBeNull()
})
