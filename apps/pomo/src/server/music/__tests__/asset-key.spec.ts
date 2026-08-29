import {describe, expect, it} from 'vitest'
import {createTrackAssetKey, getTrackAssetId} from '../asset-key'

describe('createTrackAssetKey', () => {
  it('should create an immutable key from the track and asset UUIDs', () => {
    expect(
      createTrackAssetKey({
        assetId: '123E4567-E89B-12D3-A456-426614174001',
        trackId: '123E4567-E89B-12D3-A456-426614174000',
      }),
    ).toBe(
      'tracks/123e4567-e89b-12d3-a456-426614174000/123e4567-e89b-12d3-a456-426614174001/source.mp3',
    )
  })

  it.each([
    {assetId: '../album.mp3', trackId: '123e4567-e89b-12d3-a456-426614174000'},
    {assetId: '123e4567-e89b-12d3-a456-426614174001', trackId: 'track-one'},
  ])('should reject non-UUID key input', (options) => {
    expect(() => createTrackAssetKey(options)).toThrow(TypeError)
  })
})

describe('getTrackAssetId', () => {
  it('should read an asset ID from a server-owned object key', () => {
    expect(
      getTrackAssetId(
        'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3',
      ),
    ).toBe('019d1990-1dc9-7255-a7b5-f9459dfaf782')
  })

  it.each([
    'tracks/too-short/source.mp3',
    'other/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.mp3',
    'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/019d1990-1dc9-7255-a7b5-f9459dfaf782/source.wav',
    'tracks/019d1990-1dc9-7255-a7b5-f9459dfaf781/not-an-asset/source.mp3',
  ])('should reject a malformed server object key', (objectKey) => {
    expect(() => getTrackAssetId(objectKey)).toThrow(TypeError)
  })
})
