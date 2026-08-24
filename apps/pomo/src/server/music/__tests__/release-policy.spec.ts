import {describe, expect, it} from 'vitest'

import {getAlbumReleaseReadiness} from '../release-policy'

describe('getAlbumReleaseReadiness', () => {
  it('should allow publishing an album before tracks are added', () => {
    expect(getAlbumReleaseReadiness({activeAssetTrackCount: 0, trackCount: 0})).toEqual({
      blockers: [],
      ready: true,
    })
  })

  it('should reject an album when any track lacks an active asset', () => {
    expect(getAlbumReleaseReadiness({activeAssetTrackCount: 1, trackCount: 2})).toEqual({
      blockers: ['tracks_missing_active_asset'],
      ready: false,
    })
  })

  it('should allow an album with active assets without requiring a sales offer', () => {
    expect(getAlbumReleaseReadiness({activeAssetTrackCount: 2, trackCount: 2})).toEqual({
      blockers: [],
      ready: true,
    })
  })
})
