import {createComponent, createRoot, createSignal} from 'solid-js'
import {render} from 'solid-js/web'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {MediaPlayer} from '../../../components/media-player/MediaPlayer'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'
import {createPlayerQueueController} from '../../../components/media-player/create-player-queue-controller'
import type {PTrack} from '../../focus-room-audio'
import {readCustomAlbumTracks} from '../read-custom-album-tracks'
import {useTrackPlaybackSource} from '../../../components/media-player/use-track-playback-source'
import {useTrackPreview} from '../../focus-room-audio/use-track-preview'
import {saveCustomAlbum} from '../save-custom-album'
import {revokeCustomTrackObjectUrls} from '../to-custom-p-track'
import {clearCustomAlbumDatabase} from './support/clear-database'

const id = 'custom-track:retained-queue'
const options = {
  albumId: null,
  artist: 'Artist',
  coverIcon: 'disc' as const,
  coverImage: {kind: 'keep' as const},
  coverSource: 'automatic' as const,
  title: 'Album',
}
const track = (audio: Blob) => ({
  audio,
  durationSeconds: 10,
  fileName: 'native.mp3',
  id,
  title: 'Song',
})
const loadAudio = (source: string): Promise<{event: string; code: number | null}> =>
  new Promise((resolve) => {
    const audio = document.createElement('audio')
    const finish = (event: string) => {
      const code = audio.error?.code ?? null
      audio.removeAttribute('src')
      audio.load()
      resolve({code, event})
    }
    audio.addEventListener('loadedmetadata', () => finish('loadedmetadata'), {once: true})
    audio.addEventListener('error', () => finish('error'), {once: true})
    audio.src = source
    audio.load()
  })

beforeEach(async ({skip}) => {
  try {
    await new Promise<void>((resolve, reject) => {
      const request = indexedDB.open(`native-blob-baseline-${crypto.randomUUID()}`, 1)
      request.onupgradeneeded = () => request.result.createObjectStore('blob')
      request.onerror = () => reject(request.error)
      request.onsuccess = () => {
        const database = request.result
        const transaction = database.transaction('blob', 'readwrite')
        const finish = () => {
          database.close()
          indexedDB.deleteDatabase(database.name)
        }
        transaction.onabort = () => {
          const {error} = transaction
          finish()
          reject(error)
        }
        transaction.oncomplete = () => {
          finish()
          resolve()
        }
        transaction.objectStore('blob').put(new Blob(['baseline']), 'one')
      }
    })
  } catch (error: unknown) {
    if (
      error instanceof DOMException &&
      error.name === 'UnknownError' &&
      error.message === 'Error preparing Blob/File data to be stored in object store'
    ) {
      skip(`Native baseline before product: ${error.name}: ${error.message}`)
    }
    throw error
  }
})

afterEach(async () => {
  vi.restoreAllMocks()
  revokeCustomTrackObjectUrls(new Set([id]))
  await clearCustomAlbumDatabase()
})

it('preserves queue and preview snapshots after same-ID save and fresh read', async () => {
  const [firstAudio, replacement] = await Promise.all([
    fetch('/tour/audio/ko/music-album.mp3').then((r) => r.blob()),
    fetch('/tour/audio/en/music-album.mp3').then((r) => r.blob()),
  ])
  const albumId = await saveCustomAlbum({...options, tracks: [track(firstAudio)]})
  const first = await readCustomAlbumTracks({onError: vi.fn(), trackIds: [id]})
  const root = createRoot((dispose) => {
    const [tracks, setTracks] = createSignal<readonly PTrack[]>([])
    const [entryIds, setEntryIds] = createSignal<readonly string[]>([])
    const controller = createPlayerQueueController({
      cancelPendingRestart: vi.fn(),
      clearPlaybackTransition: vi.fn(),
      isPlaying: () => false,
      isQueueControlled: () => false,
      onPlaybackRevisionChange: vi.fn(),
      order: {clearShuffleQueue: vi.fn(), resetOrder: vi.fn()},
      persistTrackQueue: vi.fn(),
      playback: {invalidate: vi.fn(), stop: vi.fn()},
      playbackPersistence: {
        persistCurrentPlayback: vi.fn(),
        persistStoppedPlayback: vi.fn(),
        setPendingPosition: vi.fn(),
        writePlayback: vi.fn(),
      },
      prepareTrackChange: vi.fn(),
      previewPlayback: {preventResume: vi.fn()},
      readCurrentIndex: () => 0,
      readQueueEntryIds: entryIds,
      readTracks: tracks,
      restorePendingPlayback: vi.fn(),
      setCurrentIndex: vi.fn(),
      setLoadedEntryIds: setEntryIds,
      setLoadedTracks: setTracks,
      visualizer: {stop: vi.fn()},
    })
    controller.addTracksToQueue(first)
    const element = document.createElement('audio')
    const owner = useTrackPlaybackSource({
      element: () => element,
      onError: (error) => {
        throw error
      },
      track: () => tracks()[0],
    })
    const preview = useTrackPreview({})
    const previewElement = document.createElement('audio')
    vi.spyOn(previewElement, 'play').mockResolvedValue()
    preview.setAudioElement(previewElement)
    return {controller, dispose, element, owner, preview, previewElement, tracks}
  })
  try {
    const retained = root.tracks()[0]!
    expect(retained).toBe(first[0])
    expect((await loadAudio(retained.source)).event).toBe('loadedmetadata')
    await saveCustomAlbum({...options, albumId, tracks: [track(replacement)]})
    const fresh = await readCustomAlbumTracks({onError: vi.fn(), trackIds: [id]})
    root.owner.ensureSource()
    const ownedSource = root.element.src
    const oldResult = await loadAudio(ownedSource)
    await root.preview.togglePreview(retained)
    const previewSource = root.previewElement.src
    expect((await loadAudio(previewSource)).event).toBe('loadedmetadata')
    expect(previewSource).not.toBe(ownedSource)
    expect(await fetch(ownedSource).then((r) => r.arrayBuffer())).toEqual(
      await firstAudio.arrayBuffer(),
    )
    expect(await fetch(previewSource).then((r) => r.arrayBuffer())).toEqual(
      await firstAudio.arrayBuffer(),
    )
    const container = document.createElement('div')
    const disposePlayer = render(
      () =>
        createComponent(PreferenceProvider, {
          get children() {
            return createComponent(MediaPlayer, {tracks: root.tracks()})
          },
        }),
      container,
    )
    const playerSource = container.querySelector('audio')!.src
    try {
      expect(playerSource).not.toBe(retained.source)
      expect((await loadAudio(playerSource)).event).toBe('loadedmetadata')
      expect(await fetch(playerSource).then((r) => r.arrayBuffer())).toEqual(
        await firstAudio.arrayBuffer(),
      )
    } finally {
      disposePlayer()
    }
    await expect(fetch(playerSource)).rejects.toThrow()
    const freshResult = await loadAudio(fresh[0]!.source)
    console.log(
      'retained-queue-native',
      JSON.stringify({
        browser: navigator.userAgent,
        freshResult,
        oldResult,
        retainedSame: root.tracks()[0] === retained,
      }),
    )
    expect(oldResult.event).toBe('loadedmetadata')
    expect(await fetch(fresh[0]!.source).then((r) => r.arrayBuffer())).toEqual(
      await replacement.arrayBuffer(),
    )
    root.controller.clearTrackQueue()
    expect(root.element.hasAttribute('src')).toBe(false)
    await expect(fetch(ownedSource)).rejects.toThrow()
    expect((await loadAudio(previewSource)).event).toBe('loadedmetadata')
    root.preview.handleEnded()
    await expect(fetch(previewSource)).rejects.toThrow()
    expect(freshResult.event).toBe('loadedmetadata')
  } finally {
    root.dispose()
  }
})
