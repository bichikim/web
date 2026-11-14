import {expect, test} from 'vitest'
import {createMouthTrack, sampleMouthTrack} from '../mouth-track'

test('should retain a compact mouth timeline that can be replayed without PCM analysis', () => {
  const track = createMouthTrack(
    {sampleRate: 1000, samples: new Float32Array(1000).fill(0.1)},
    '오',
  )
  expect(track.frames).toBeInstanceOf(Float32Array)
  expect(track.frames.length).toBe(102)
  expect(sampleMouthTrack(track, 0.2).open).toBeGreaterThan(0.6)
  expect(sampleMouthTrack(track, 0.2).form).toBeLessThan(-0.9)
  expect(sampleMouthTrack(track, -1)).toEqual({form: 0, open: 0})
  expect(sampleMouthTrack(track, 1)).toEqual({form: 0, open: 0})
  const earlier = sampleMouthTrack(track, 0.23)
  sampleMouthTrack(track, 0.9)
  expect(sampleMouthTrack(track, 0.23)).toEqual(earlier)
})

test('should interpolate cached frames against the playback clock', () => {
  const track = {duration: 1, frames: Float32Array.of(0, -1, 1, 1, 0, 0), step: 0.5}
  expect(sampleMouthTrack(track, 0.25)).toEqual({form: 0, open: 0.5})
  expect(sampleMouthTrack(track, 0.75)).toEqual({form: 0.5, open: 0.5})
})
