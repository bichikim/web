/** @vitest-environment node */
import {beforeEach, describe, expect, it, vi} from 'vitest'

const accessMocks = vi.hoisted(() => ({requestTrackAccess: vi.fn()}))

vi.mock('../track-preview-access', () => accessMocks)

import {resolvePTrackSource} from '../focus-room-playlist/track-source'

beforeEach(() => {
  accessMocks.requestTrackAccess.mockReset()
})

describe('resolvePTrackSource', () => {
  it('should preserve a legacy public URL and resolve an explicit public source', () => {
    expect(resolvePTrackSource('/free.mp3')).toBe('/free.mp3')
    expect(resolvePTrackSource({kind: 'public', url: 'https://audio.example/free.mp3'})).toBe(
      'https://audio.example/free.mp3',
    )
  })

  it('should request a fresh full URL for an entitled source', async () => {
    accessMocks.requestTrackAccess.mockResolvedValue({
      expiresAt: '2026-09-20T01:00:00.000Z',
      mode: 'full',
      url: 'https://audio.example/track.mp3?token=signed',
    })

    await expect(resolvePTrackSource({kind: 'entitled', trackId: 'track-1'})).resolves.toBe(
      'https://audio.example/track.mp3?token=signed',
    )
    expect(accessMocks.requestTrackAccess).toHaveBeenCalledWith('track-1')
  })

  it.each([
    ['an anonymous user', null],
    ['a preview-only response', {mode: 'preview', url: '/preview.mp3'}],
  ])('should refuse playback without full access for %s', async (_name, access) => {
    accessMocks.requestTrackAccess.mockResolvedValue(access)

    await expect(resolvePTrackSource({kind: 'entitled', trackId: 'track-1'})).rejects.toThrow(
      'Full track access is required for playback',
    )
  })
})
