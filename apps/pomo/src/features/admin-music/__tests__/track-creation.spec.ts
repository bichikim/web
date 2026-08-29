/** @vitest-environment jsdom */

import {afterEach, expect, it, vi} from 'vitest'

import {createTrackWithAudio} from '../track-creation'

const ALBUM_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf780'
const TRACK_ID = '019d1990-1dc9-7255-a7b5-f9459dfaf781'

afterEach(() => {
  vi.unstubAllGlobals()
})

it('should create a track and upload its MP3 successfully', async () => {
  const assetId = '019d1990-1dc9-7255-a7b5-f9459dfaf782'
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({id: TRACK_ID}))
    .mockResolvedValueOnce(
      Response.json({
        assetId,
        expiresAt: '2026-08-22T15:00:00.000Z',
        uploadUrl: 'https://account.r2.cloudflarestorage.com/bucket/key?signature=value',
      }),
    )
    .mockResolvedValueOnce(new Response(null, {status: 200}))
    .mockResolvedValueOnce(Response.json({assetId, status: 'active'}))
  vi.stubGlobal('fetch', fetcher)

  await expect(
    createTrackWithAudio({
      albumId: ALBUM_ID,
      artist: '아티스트',
      audio: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
      title: '곡명',
    }),
  ).resolves.toEqual({success: true})
})

it('should reject when the track record cannot be created', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response(null, {status: 503})))

  await expect(
    createTrackWithAudio({
      albumId: ALBUM_ID,
      artist: '아티스트',
      audio: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
      title: '곡명',
    }),
  ).rejects.toThrow('곡 정보를 저장하지 못했습니다.')
})

it('should remove the track record when its MP3 upload cannot start', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({id: TRACK_ID}))
    .mockResolvedValueOnce(Response.json({error: 'unavailable'}, {status: 503}))
    .mockResolvedValueOnce(new Response(null, {status: 204}))
  vi.stubGlobal('fetch', fetcher)

  const result = await createTrackWithAudio({
    albumId: ALBUM_ID,
    artist: '아티스트',
    audio: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
    title: '곡명',
  })

  expect(result).toMatchObject({cleanupSucceeded: true, success: false})
  expect(fetcher).toHaveBeenNthCalledWith(3, `/api/admin/music/tracks/${TRACK_ID}`, {
    method: 'DELETE',
  })
})

it('should expose a cleanup failure after an MP3 upload failure', async () => {
  const fetcher = vi
    .fn<typeof fetch>()
    .mockResolvedValueOnce(Response.json({id: TRACK_ID}))
    .mockResolvedValueOnce(Response.json({error: 'unavailable'}, {status: 503}))
    .mockResolvedValueOnce(Response.json({error: 'unavailable'}, {status: 503}))
  vi.stubGlobal('fetch', fetcher)

  const result = await createTrackWithAudio({
    albumId: ALBUM_ID,
    artist: '아티스트',
    audio: new File(['mp3'], 'track.mp3', {type: 'audio/mpeg'}),
    title: '곡명',
  })

  expect(result).toMatchObject({cleanupSucceeded: false, success: false})
})
