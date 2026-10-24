import {createStore} from 'solid-js/store'
import {afterEach, expect, it, vi} from 'vitest'

const HEADER_BYTES = 32
const STRESS_SELECTIONS = 20

it.each(['spread', 'structured-clone', 'solid-proxy'] as const)(
  'checks immutable audio snapshot data through %s without object identity assumptions',
  async (mode) => {
    const audio = await fetch('/tour/audio/ko/music-album.mp3').then((response) => response.blob())
    const original = {
      artist: 'Artist',
      durationSeconds: 10,
      id: 'custom-track:snapshot-capability',
      source: 'blob:cache-source',
      sourceBlob: audio,
      title: 'Song',
    }
    const [proxy] = createStore(original)
    const copied =
      mode === 'spread'
        ? {...original, title: 'Renamed'}
        : mode === 'structured-clone'
          ? structuredClone(original)
          : proxy
    expect(copied.sourceBlob).toBeInstanceOf(Blob)
    const source = URL.createObjectURL(copied.sourceBlob)
    try {
      const output = await fetch(source).then((response) => response.arrayBuffer())
      expect(output.byteLength).toBe(audio.size)
      expect(new Uint8Array(output).slice(0, HEADER_BYTES)).toEqual(
        new Uint8Array(await audio.arrayBuffer()).slice(0, HEADER_BYTES),
      )
    } finally {
      URL.revokeObjectURL(source)
    }
    await expect(fetch(source)).rejects.toThrow()
    expect(JSON.parse(JSON.stringify(copied)).sourceBlob).toEqual({})
  },
)

import {createComponent, createRoot, createSignal} from 'solid-js'
import {usePlayback} from '../use-playback'
import {acquireTrackPlaybackSource} from '../../../features/focus-room-audio/track-playback-source'
import {useTrackPlaybackSource as createPlaybackSourceOwner} from '../use-track-playback-source'
import type {PTrack as SnapshotTrack} from '../../../features/focus-room-audio/focus-room-playlist/model'

const disposals: Array<() => void> = []
afterEach(() => {
  disposals.splice(0).forEach((dispose) => dispose())
  vi.restoreAllMocks()
})
const fixture = async (language = 'ko'): Promise<SnapshotTrack> => ({
  artist: 'Artist',
  durationSeconds: 10,
  id: `custom-track:${language}`,
  source: `blob:cache-${language}`,
  sourceBlob: await fetch(`/tour/audio/${language}/music-album.mp3`).then((response) =>
    response.blob(),
  ),
  title: 'Song',
})
const metadata = (audio: HTMLAudioElement): Promise<void> =>
  new Promise((resolve, reject) => {
    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', success)
      audio.removeEventListener('error', failure)
    }
    const success = () => {
      cleanup()
      resolve()
    }
    const failure = () => {
      cleanup()
      reject(new Error(`native audio error ${audio.error?.code}`))
    }
    audio.addEventListener('loadedmetadata', success)
    audio.addEventListener('error', failure)
  })
const owner = () =>
  createRoot((dispose) => {
    const audio = document.createElement('audio')
    const [track, select] = createSignal<SnapshotTrack>()
    const errors = vi.fn()
    const binding = createPlaybackSourceOwner({element: () => audio, onError: errors, track})
    const playback = usePlayback({element: () => audio})
    disposals.push(dispose)
    return {audio, binding, dispose, errors, playback, select}
  })

it('checks a production lease can be released twice without revoking twice', async () => {
  const track = await fixture()
  const revoke = vi.spyOn(URL, 'revokeObjectURL')
  const lease = acquireTrackPlaybackSource(track)
  expect((await fetch(lease.source)).ok).toBe(true)
  lease.release?.()
  lease.release?.()
  expect(revoke).toHaveBeenCalledExactlyOnceWith(lease.source)
  await expect(fetch(lease.source)).rejects.toThrow()
})

it('checks production metadata and pause/stop retain the selected source and position', async () => {
  const track = await fixture()
  const view = owner()
  const ready = metadata(view.audio)
  view.select(track)
  await ready
  const source = view.audio.src
  const position = Math.min(1, view.audio.duration / 2)
  view.audio.currentTime = position
  const create = vi.spyOn(URL, 'createObjectURL')
  const load = vi.spyOn(view.audio, 'load')
  view.select({...track})
  view.playback.pause()
  view.playback.stop()
  expect(view.binding.ensureSource()).toBe(true)
  expect(view.audio.src).toBe(source)
  expect(view.audio.currentTime).toBeCloseTo(position)
  expect(create).not.toHaveBeenCalled()
  expect(load).not.toHaveBeenCalled()
  view.dispose()
  expect(view.audio.getAttribute('src')).toBeNull()
  await expect(fetch(source)).rejects.toThrow()
  expect(view.binding.ensureSource()).toBe(false)
  expect(view.errors).not.toHaveBeenCalled()
})

it('checks production replacement and clear release the consumed MP3 URL', async () => {
  const first = await fixture('ko')
  const second = await fixture('en')
  const view = owner()
  let ready = metadata(view.audio)
  view.select(first)
  await ready
  const original = view.audio.src
  ready = metadata(view.audio)
  view.select(second)
  await ready
  const replacement = view.audio.src
  expect(replacement).not.toBe(original)
  await expect(fetch(original)).rejects.toThrow()
  expect((await fetch(replacement)).ok).toBe(true)
  view.select(undefined)
  expect(view.audio.getAttribute('src')).toBeNull()
  await expect(fetch(replacement)).rejects.toThrow()
  expect(view.errors).not.toHaveBeenCalled()
})

it('checks production acquisition failure remains observable and a manual request can retry', async () => {
  const track = await fixture()
  const view = owner()
  const failure = new Error('Native URL allocation failed')
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementationOnce(() => {
    throw failure
  })
  view.select(track)
  expect(view.errors).toHaveBeenCalledExactlyOnceWith(failure)
  expect(view.audio.getAttribute('src')).toBeNull()
  create.mockRestore()
  const ready = metadata(view.audio)
  expect(view.binding.ensureSource()).toBe(true)
  await ready
  expect((await fetch(view.audio.src)).ok).toBe(true)
})

it('preserves remote source strings without acquiring a Blob URL', async () => {
  const lease = acquireTrackPlaybackSource({source: '/tour/audio/ko/music-album.mp3'})
  expect(lease.source).toBe('/tour/audio/ko/music-album.mp3')
  expect(lease.release).toBeUndefined()
})

it('checks a failed replacement releases the old owner and a manual retry loads the new MP3', async () => {
  const first = await fixture('ko')
  const second = await fixture('en')
  const view = owner()
  let ready = metadata(view.audio)
  view.select(first)
  await ready
  const original = view.audio.src
  const failure = new Error('Replacement URL allocation failed')
  const create = vi.spyOn(URL, 'createObjectURL').mockImplementationOnce(() => {
    throw failure
  })
  view.select(second)
  expect(view.errors).toHaveBeenCalledExactlyOnceWith(failure)
  expect(view.audio.paused).toBe(true)
  expect(view.audio.getAttribute('src')).toBeNull()
  await expect(fetch(original)).rejects.toThrow()
  create.mockRestore()
  ready = metadata(view.audio)
  expect(view.binding.ensureSource()).toBe(true)
  await ready
  expect((await fetch(view.audio.src)).ok).toBe(true)
})

it.each([2, STRESS_SELECTIONS])(
  'checks production live URL count stays bounded across %i selected-source changes',
  async (count) => {
    const track = await fixture()
    const nativeCreate = URL.createObjectURL.bind(URL)
    const nativeRevoke = URL.revokeObjectURL.bind(URL)
    const alive = new Set<string>()
    let maximum = 0
    vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
      const source = nativeCreate(blob)
      alive.add(source)
      maximum = Math.max(maximum, alive.size)
      return source
    })
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation((source) => {
      alive.delete(source)
      nativeRevoke(source)
    })
    const view = owner()
    const ready = metadata(view.audio)
    for (let index = 0; index < count; index += 1) {
      view.select({...track, id: `${track.id}:${index}`, source: `blob:selection:${index}`})
      expect(alive.size).toBe(1)
    }
    await ready
    expect(maximum).toBe(2)
    view.dispose()
    expect(alive.size).toBe(0)
  },
)

import {render} from 'solid-js/web'
import {PreferenceProvider} from 'src/hooks/use-preference'
import {MediaPlayer} from '../MediaPlayer'

const observeNativeAudio = (
  allocationAllowed: () => boolean,
  snapshots: readonly SnapshotTrack[],
) => {
  const nativeCreate = URL.createObjectURL.bind(URL)
  const acquiredSources: string[] = []
  vi.spyOn(URL, 'createObjectURL').mockImplementation((blob) => {
    if (!allocationAllowed()) {
      throw new Error('Injected URL allocation failure')
    }
    const source = nativeCreate(blob)
    if (snapshots.some((track) => blob === track.sourceBlob)) {
      acquiredSources.push(source)
    }
    return source
  })
  const nativePlay = HTMLMediaElement.prototype.play
  const playedSources: string[] = []
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(
    function observePlay(this: HTMLMediaElement) {
      playedSources.push(this.getAttribute('src') ?? '')
      return nativePlay.call(this)
    },
  )
  return {acquiredSources, playedSources}
}

it.each(['normal', 'initial-failure', 'replacement-failure'] as const)(
  'gates the actual media-chrome button request at the native play boundary: %s',
  async (mode) => {
    const first = await fixture()
    const second = await fixture('en')
    let allocationAllowed = mode !== 'initial-failure'
    const {acquiredSources, playedSources} = observeNativeAudio(
      () => allocationAllowed,
      [first, second],
    )
    const [selected, setSelected] = createSignal<readonly SnapshotTrack[]>([first])
    const errors = vi.fn()
    const onPlayRequest = vi.fn()
    const button = document.createElement('media-play-button')
    const container = document.createElement('div')
    document.body.append(container)
    const dispose = render(
      () =>
        createComponent(PreferenceProvider, {
          get children() {
            return createComponent(MediaPlayer, {
              children: button,
              onError: errors,
              onPlayRequest,
              get tracks() {
                return selected()
              },
            })
          },
        }),
      container,
    )
    try {
      await new Promise<void>((resolve) => {
        if (button.hasAttribute('mediapaused')) {
          resolve()
          return
        }
        const observer = new MutationObserver(() => {
          if (button.hasAttribute('mediapaused')) {
            observer.disconnect()
            resolve()
          }
        })
        observer.observe(button, {attributes: true})
      })
      const audio = container.querySelector('audio')!
      const controller = container.querySelector('media-controller')!
      expect(controller.isConnected).toBe(true)
      expect((controller as HTMLElement & {media: HTMLMediaElement}).media).toBe(audio)
      if (mode === 'replacement-failure') {
        allocationAllowed = false
        setSelected([second])
      }
      if (mode !== 'normal') {
        expect(audio.hasAttribute('src')).toBe(false)
        button.click()
        console.log('media-button-failed-request', JSON.stringify({mode, playedSources}))
        expect(playedSources).toEqual([])
        expect(errors).toHaveBeenCalled()
        expect(onPlayRequest).not.toHaveBeenCalled()
        allocationAllowed = true
      }
      const before = playedSources.length
      button.click()
      console.log(
        'media-button-retry',
        JSON.stringify({mode, playedSources, source: audio.getAttribute('src')}),
      )
      expect(playedSources).toHaveLength(before + 1)
      expect(playedSources.at(-1)).toBe(audio.getAttribute('src'))
      expect(playedSources.at(-1)).toMatch(/^blob:/u)
      expect(onPlayRequest).toHaveBeenCalledOnce()
    } finally {
      dispose()
      container.remove()
    }
    expect(acquiredSources).toHaveLength(mode === 'replacement-failure' ? 2 : 1)
    await Promise.all(acquiredSources.map((source) => expect(fetch(source)).rejects.toThrow()))
  },
)
