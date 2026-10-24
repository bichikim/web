/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import type {ResolvedCustomAlbum} from 'src/features/custom-albums'

const mocks = vi.hoisted(() => ({revokeCustomTrackObjectUrls: vi.fn()}))
vi.mock('@solidjs/router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@solidjs/router')>()),
  action: vi.fn((action) => action),
  useAction: vi.fn((action) => action),
  useSubmissions: vi.fn(() => []),
}))
vi.mock('src/features/custom-albums', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/features/custom-albums')>()),
  ...mocks,
}))
vi.mock('../CustomAlbumEditorModal', () => ({CustomAlbumEditorModal: () => null}))

import {CustomAlbumSection} from '../CustomAlbumSection'

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each([
  {album: ['a', 'b', 'a'], player: ['b', 'other'], revoked: ['a']},
  {album: ['c', 'a', 'b'], player: ['a'], revoked: ['c', 'b']},
  {album: ['a', 'b'], player: ['a', 'b'], revoked: []},
  {album: ['b', 'a'], player: [], revoked: ['b', 'a']},
  {album: ['a', 'b'], player: ['b', 'other', 'third'], revoked: ['a']},
  {album: [], player: ['other'], revoked: []},
])(
  'should revoke only deleted album IDs absent from the latest player for $album',
  async (scenario) => {
    const album: ResolvedCustomAlbum = {
      customCoverImage: null,
      description: '',
      icon: 'i-tabler-disc',
      id: 'album',
      title: 'Album',
      trackCount: scenario.album.length,
      trackIds: scenario.album,
      tracks: scenario.album.map((id) => ({
        artist: '',
        durationSeconds: 1,
        id,
        source: `blob:${id}`,
        title: id,
      })),
    }
    const originalPlayer = new Set(scenario.album)
    const latestPlayer = new Set(scenario.player)
    const [trackIds, setTrackIds] = createSignal<ReadonlySet<string>>(originalPlayer)
    const onRemoveTracks = vi.fn((_removed: ReadonlySet<string>) => setTrackIds(latestPlayer))
    const onPreview = vi.fn()
    const onDeleteAlbum = vi.fn(async () => undefined)
    render(() => (
      <CustomAlbumSection
        albums={[album]}
        error={null}
        isLoading={false}
        onAddAlbum={vi.fn()}
        onAddTrack={vi.fn()}
        onDeleteAlbum={onDeleteAlbum}
        onRemoveTracks={onRemoveTracks}
        onSaved={vi.fn(async () => undefined)}
        onPreview={onPreview}
        onRetry={vi.fn()}
        pendingTrackId={null}
        playingTrackId={scenario.album[0] ?? null}
        trackIds={trackIds()}
      />
    ))

    const deleteButton = screen.getByRole('button', {name: /삭제|Delete/u})
    fireEvent.click(deleteButton)
    fireEvent.click(deleteButton)
    await Promise.resolve()
    expect(onDeleteAlbum).toHaveBeenCalledWith('album')
    const removed = onRemoveTracks.mock.calls[0]![0]
    const revoked = mocks.revokeCustomTrackObjectUrls.mock.calls[0]![0] as ReadonlySet<string>
    expect([...removed]).toEqual([...new Set(scenario.album)])
    expect([...revoked]).toEqual(scenario.revoked)
    expect([...originalPlayer]).toEqual([...new Set(scenario.album)])
    expect([...latestPlayer]).toEqual(scenario.player)
    expect(onRemoveTracks.mock.invocationCallOrder[0]).toBeLessThan(
      mocks.revokeCustomTrackObjectUrls.mock.invocationCallOrder[0]!,
    )
    if (scenario.album.length > 0) {
      expect(onPreview).toHaveBeenCalledWith(album.tracks[0])
      expect(onPreview.mock.invocationCallOrder[0]).toBeLessThan(
        onRemoveTracks.mock.invocationCallOrder[0]!,
      )
    }
  },
)
