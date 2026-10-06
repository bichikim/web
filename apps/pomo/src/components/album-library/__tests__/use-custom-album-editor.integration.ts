/** @vitest-environment node */

import 'fake-indexeddb/auto'
import {createRoot} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'

const mocks = vi.hoisted(() => ({
  albumByteLimit: 1000,
  embeddedCoverBytes: 200,
}))

vi.mock('src/features/custom-albums/model', async (importOriginal) => {
  const actual = await importOriginal<typeof import('src/features/custom-albums/model')>()
  return {
    ...actual,
    MAXIMUM_CUSTOM_ALBUM_BYTES: mocks.albumByteLimit,
  }
})

vi.mock('src/features/custom-albums/read-embedded-audio-cover', () => ({
  readEmbeddedAudioCover: vi.fn(
    async () => new Blob([new Uint8Array(mocks.embeddedCoverBytes)], {type: 'image/jpeg'}),
  ),
}))

const DATABASE_NAME = 'pomo-custom-albums'
const rootDisposers: Array<() => void> = []

const resetCustomAlbumStorage = async (): Promise<void> => {
  try {
    const {openCustomAlbumDatabase} = await import('src/features/custom-albums/database')
    const database = await openCustomAlbumDatabase()
    database.close()

    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.deleteDatabase(DATABASE_NAME)
      request.onsuccess = () => resolve()
      request.onerror = () => reject(request.error)
      request.onblocked = () => reject(new Error('Custom album database deletion was blocked.'))
    })
  } finally {
    vi.resetModules()
  }
}

afterEach(async () => {
  for (const dispose of rootDisposers.splice(0)) {
    dispose()
  }

  try {
    await resetCustomAlbumStorage()
  } finally {
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  }
})

const stubAudioMetadata = (durationSeconds = 60): void => {
  vi.stubGlobal('document', {
    createElement: (tagName: string) => {
      if (tagName !== 'audio') {
        throw new Error(`Unexpected element: ${tagName}`)
      }

      let loadedMetadataListener: (() => void) | undefined

      return {
        addEventListener: (eventName: string, listener: () => void) => {
          if (eventName === 'loadedmetadata') {
            loadedMetadataListener = listener
          }
        },
        duration: durationSeconds,
        load: () => loadedMetadataListener?.(),
        preload: '',
        removeAttribute: vi.fn(),
        removeEventListener: vi.fn(),
      }
    },
  } as unknown as Document)
  vi.spyOn(globalThis.URL, 'createObjectURL').mockReturnValue('blob:audio')
  vi.spyOn(globalThis.URL, 'revokeObjectURL').mockImplementation(() => undefined)
}

const createAudioFile = (size: number): File =>
  new File([new Uint8Array(size)], 'song.mp3', {type: 'audio/mpeg'})

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
  stubAudioMetadata()
  vi.stubGlobal('crypto', {randomUUID: () => 'test-id'})

  const {controller, onOpenChange, onSaved} = await createEditor()
  controller.setTitle('Album')
  await selectFiles(controller, [createAudioFile(mocks.albumByteLimit - 100)])

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
  stubAudioMetadata()
  vi.stubGlobal('crypto', {randomUUID: () => 'test-id'})

  const {controller} = await createEditor()
  const manualCover = new Blob([new Uint8Array(mocks.embeddedCoverBytes)], {type: 'image/webp'})
  controller.handleCoverCropApplied(manualCover)
  controller.setTitle('Album')
  await selectFiles(controller, [createAudioFile(mocks.albumByteLimit - manualCover.size)])

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
