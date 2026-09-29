/** @vitest-environment jsdom */
import {expect, it} from 'vitest'

import {readTrackMetadata} from '../features/admin-music/track-metadata'

it('should fall back to the artists list when the primary artist tag is an empty string', async () => {
  const metadata = await readTrackMetadata(new File(['mp3'], 'track.mp3'), {
    parseMetadata: async () => ({
      common: {artist: '', artists: ['Pomo', 'Friend'], title: 'Focus Song'},
    }),
  })

  expect(metadata).toEqual({artist: 'Pomo, Friend', title: 'Focus Song'})
})
