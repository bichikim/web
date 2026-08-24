import {describe, expect, it} from 'vitest'
import {createTrackAssetKey} from '../asset-key'

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
