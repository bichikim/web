/** @vitest-environment jsdom */
import {cleanup, renderHook} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import type {CustomAlbumDraft, CustomAlbumTrack} from 'src/features/custom-albums'

const mocks = vi.hoisted(() => ({
  addCustomAlbumTracks: vi.fn(),
  readCustomAlbumDraft: vi.fn(),
  saveCustomAlbum: vi.fn(),
}))
vi.mock('src/features/custom-albums', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/features/custom-albums')>()),
  ...mocks,
}))

import {useCustomAlbumEditor} from '../use-custom-album-editor'

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
})

const createTrack = (id: string): CustomAlbumTrack => ({
  audio: new Blob(['audio']),
  durationSeconds: 1,
  fileName: `${id}.mp3`,
  id,
  title: id,
})

it.each([
  {added: [], initial: [], removed: [], retained: []},
  {added: [], initial: ['a', 'b', 'a'], removed: ['a'], retained: ['b']},
  {added: [], initial: ['c', 'a', 'b'], removed: ['c', 'b'], retained: ['a']},
  {added: [], initial: ['a', 'b', 'c'], removed: [], retained: ['a', 'b', 'c']},
  {added: [], initial: ['b', 'a'], removed: ['b', 'a'], retained: []},
  {added: ['x', 'y', 'z'], initial: ['a', 'b'], removed: ['a'], retained: ['b', 'x', 'y', 'z']},
])(
  'should report removed initial track IDs in order for $initial and $retained',
  async (scenario) => {
    const draft: CustomAlbumDraft = {
      artist: '',
      coverIcon: 'disc',
      coverImage: null,
      coverSource: 'automatic',
      id: 'album',
      title: 'Album',
      tracks: scenario.initial.map(createTrack),
    }
    mocks.readCustomAlbumDraft.mockResolvedValue(draft)
    mocks.saveCustomAlbum.mockResolvedValue('album')
    const onSaved = vi.fn(async (_ids: ReadonlySet<string>) => undefined)
    const onOpenChange = vi.fn()
    const {result} = renderHook(() =>
      useCustomAlbumEditor({albumId: 'album', onOpenChange, onSaved}),
    )
    await Promise.resolve()
    await Promise.resolve()
    expect(result.isLoading()).toBe(false)

    for (const id of scenario.removed) {
      result.removeTrack(id)
    }
    if (scenario.added.length > 0) {
      mocks.addCustomAlbumTracks.mockResolvedValue({
        embeddedCoverImage: null,
        kind: 'added',
        tracks: scenario.added.map(createTrack),
      })
      await result.handleFilesSelected({
        currentTarget: {files: [new File(['audio'], 'track.mp3')], value: ''},
      } as unknown as Parameters<typeof result.handleFilesSelected>[0])
    }
    const retained = result.tracks()
    expect(retained.map((track) => track.id)).toEqual(scenario.retained)
    await result.handleSubmit({preventDefault: vi.fn()} as unknown as Parameters<
      typeof result.handleSubmit
    >[0])

    expect([...onSaved.mock.calls[0]![0]]).toEqual(scenario.removed)
    expect(result.tracks()).toBe(retained)
    expect(draft.tracks.map((track) => track.id)).toEqual(scenario.initial)
    expect(mocks.saveCustomAlbum).toHaveBeenCalledWith(expect.objectContaining({tracks: retained}))
    expect(onOpenChange).toHaveBeenCalledWith(false)
  },
)

it('should preserve removed IDs on a failed save and report them after retry', async () => {
  mocks.readCustomAlbumDraft.mockResolvedValue({
    artist: '',
    coverIcon: 'disc',
    coverImage: null,
    coverSource: 'automatic',
    id: 'album',
    title: 'Album',
    tracks: [createTrack('a'), createTrack('b')],
  })
  mocks.saveCustomAlbum.mockRejectedValueOnce(new Error('save failed')).mockResolvedValue('album')
  const onSaved = vi.fn(async (_ids: ReadonlySet<string>) => undefined)
  const onOpenChange = vi.fn()
  const {result} = renderHook(() => useCustomAlbumEditor({albumId: 'album', onOpenChange, onSaved}))
  await Promise.resolve()
  await Promise.resolve()
  result.removeTrack('a')
  const event = {preventDefault: vi.fn()} as unknown as Parameters<typeof result.handleSubmit>[0]
  await result.handleSubmit(event)
  expect(onSaved).not.toHaveBeenCalled()
  expect(onOpenChange).not.toHaveBeenCalled()
  await result.handleSubmit(event)
  expect([...onSaved.mock.calls[0]![0]]).toEqual(['a'])
})
