import {
  createCustomAlbumAudioFile,
  resetCustomAlbumDatabase,
  stubCustomAlbumAudioMetadata,
} from 'src/features/custom-albums/__tests__/support'
/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  albumByteLimit: 1000,
  embeddedCoverBytes: 200,
  libraryByteLimit: 2000,
}))

vi.mock('src/features/custom-albums/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/custom-albums/model')>()
  return {
    ...actual,
    MAXIMUM_CUSTOM_ALBUM_BYTES: mocks.albumByteLimit,
    MAXIMUM_CUSTOM_LIBRARY_BYTES: mocks.libraryByteLimit,
  }
})

vi.mock('src/features/custom-albums/read-embedded-audio-cover', () => ({
  readEmbeddedAudioCover: vi.fn(
    async () => new Blob([new Uint8Array(mocks.embeddedCoverBytes)], {type: 'image/jpeg'}),
  ),
}))

const rootDisposers: Array<() => void> = []

afterEach(async () => {
  for (const dispose of rootDisposers.splice(0)) {
    dispose()
  }

  try {
    await resetCustomAlbumDatabase()
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

const createEditor = async () => {
  const {useCustomAlbumEditor} = await import('../use-custom-album-editor')
  const onOpenChange = vi.fn()
  const onSaved = vi.fn(async (_removedTrackIds: ReadonlySet<string>) => undefined)

  return createRoot((dispose) => {
    rootDisposers.push(dispose)
    return {
      controller: useCustomAlbumEditor({albumId: null, onOpenChange, onSaved}),
      onOpenChange,
      onSaved,
    }
  })
}

const selectFiles = async (
  controller: Awaited<ReturnType<typeof createEditor>>['controller'],
  files: File[],
) =>
  controller.handleFilesSelected({
    currentTarget: {files, value: 'selected'},
    target: {},
  } as unknown as Parameters<typeof controller.handleFilesSelected>[0])

const submit = async (
  controller: Awaited<ReturnType<typeof createEditor>>['controller'],
): Promise<void> =>
  controller.handleSubmit({preventDefault: vi.fn(), target: {}} as unknown as Parameters<
    typeof controller.handleSubmit
  >[0])

it('should persist valid tracks when oversized automatic artwork is skipped', async () => {
  stubCustomAlbumAudioMetadata()
  vi.stubGlobal('crypto', {randomUUID: () => 'test-id'})

  const {controller, onOpenChange, onSaved} = await createEditor()
  controller.setTitle('Album')
  await selectFiles(controller, [createCustomAlbumAudioFile(mocks.albumByteLimit - 100)])

  expect(controller.tracks()).toHaveLength(1)
  expect(controller.coverImage()).toBeNull()
  expect(controller.totalAlbumBytes()).toBe(mocks.albumByteLimit - 100)
  expect(controller.errorMessage()).toBeNull()

  await submit(controller)

  const {readCustomAlbumDraft} = await import('src/features/custom-albums')
  const draft = await readCustomAlbumDraft({albumId: 'custom-album:test-id'})

  expect(draft?.tracks).toHaveLength(1)
  expect(draft?.tracks[0]?.audio.size).toBe(mocks.albumByteLimit - 100)
  expect(draft?.coverImage).toBeNull()
  expect(onSaved).toHaveBeenCalledOnce()
  expect(onOpenChange).toHaveBeenCalledWith(false)
})

it('should preserve a manual cover when the saved album is exactly at the byte limit', async () => {
  stubCustomAlbumAudioMetadata()
  vi.stubGlobal('crypto', {randomUUID: () => 'test-id'})

  const {controller} = await createEditor()
  const manualCover = new Blob([new Uint8Array(mocks.embeddedCoverBytes)], {type: 'image/webp'})
  controller.handleCoverCropApplied(manualCover)
  controller.setTitle('Album')
  await selectFiles(controller, [
    createCustomAlbumAudioFile(mocks.albumByteLimit - manualCover.size),
  ])

  expect(controller.coverImage()).toBe(manualCover)
  expect(controller.totalAlbumBytes()).toBe(mocks.albumByteLimit)
  expect(controller.errorMessage()).toBeNull()

  await submit(controller)

  const {readCustomAlbumDraft} = await import('src/features/custom-albums')
  const draft = await readCustomAlbumDraft({albumId: 'custom-album:test-id'})

  expect(draft?.tracks[0]?.audio.size).toBe(mocks.albumByteLimit - manualCover.size)
  expect(draft?.coverImage?.size).toBe(manualCover.size)
  expect(draft?.coverSource).toBe('manual')
})

it('should stop processing a stalled import and show the existing generic error at the deadline', async () => {
  const audio = stubCustomAlbumAudioMetadata()
  audio.load.mockImplementation(() => undefined)
  const {controller} = await createEditor()
  const messages = await import('@paraglide/message')
  const runtime = await import('@paraglide/runtime')
  const library = await import('src/features/custom-albums/read-custom-album-library-bytes')
  vi.spyOn(library, 'readCustomAlbumLibraryBytes').mockResolvedValue(0)
  const originalGetLocale = runtime.getLocale
  runtime.overwriteGetLocale(() => 'en')
  vi.useFakeTimers()
  try {
    const pending = selectFiles(controller, [createCustomAlbumAudioFile(100)])
    expect(controller.isProcessingFiles()).toBe(true)
    await vi.advanceTimersByTimeAsync(30_000)
    await pending
    expect(controller.isProcessingFiles()).toBe(false)
    expect(controller.tracks()).toHaveLength(0)
    expect(controller.errorMessage()).toBe(messages.album_custom_error_save())
    expect(audio.removeAttribute).toHaveBeenCalledExactlyOnceWith('src')
    expect(URL.revokeObjectURL).toHaveBeenCalledExactlyOnceWith('blob:audio')
    expect(vi.getTimerCount()).toBe(0)
  } finally {
    vi.useRealTimers()
    runtime.overwriteGetLocale(originalGetLocale)
  }
})

it('should show the library limit during addition and preserve the existing draft', async () => {
  const runtime = await import('@paraglide/runtime')
  const originalGetLocale = runtime.getLocale
  runtime.overwriteGetLocale(() => 'en')
  try {
    const audio = stubCustomAlbumAudioMetadata()
    vi.stubGlobal('crypto', {
      randomUUID: vi
        .fn()
        .mockReturnValueOnce('first')
        .mockReturnValueOnce('second')
        .mockReturnValue('test-id'),
    })
    const {saveCustomAlbum} = await import('src/features/custom-albums')
    await Promise.all(
      ['first', 'second'].map((id) =>
        saveCustomAlbum({
          albumId: null,
          artist: '',
          coverIcon: 'disc',
          coverImage: {image: null, kind: 'replace'},
          coverSource: 'manual',
          title: id,
          tracks: [
            {
              audio: createCustomAlbumAudioFile(800),
              durationSeconds: 60,
              fileName: `${id}.mp3`,
              id: `custom-track:${id}`,
              title: id,
            },
          ],
        }),
      ),
    )
    const {controller, onSaved} = await createEditor()
    await selectFiles(controller, [createCustomAlbumAudioFile(100)])
    const existingTracks = controller.tracks()
    expect(controller.totalAlbumBytes()).toBe(300)
    audio.load.mockClear()

    await selectFiles(controller, [createCustomAlbumAudioFile(200)])

    const messages = await import('@paraglide/message')
    expect(controller.errorMessage()).toBe(messages.album_custom_error_library_too_large())
    expect(controller.tracks()).toBe(existingTracks)
    expect(controller.totalAlbumBytes()).toBe(300)
    expect(controller.isProcessingFiles()).toBe(false)
    expect(audio.load).not.toHaveBeenCalled()
    expect(onSaved).not.toHaveBeenCalled()
  } finally {
    runtime.overwriteGetLocale(originalGetLocale)
  }
})
