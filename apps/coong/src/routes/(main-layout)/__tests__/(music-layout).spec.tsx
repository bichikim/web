/** @vitest-environment jsdom */
import {render, waitFor} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'
import {useLocation, useNavigate, useSearchParams} from '@solidjs/router'
import {useCookieStorage} from 'src/use/storage'
import {createSplendidGrandPiano} from 'src/use/instruments'
import {type MidiPlayerContextProps, useMidiPlayer} from 'src/components/midi-player/context'
import {getPresetData} from 'src/server/preset'
import MusicLayout from '../(music-layout)'

vi.mock('@solidjs/router', () => ({
  useLocation: vi.fn(),
  useNavigate: vi.fn(),
  useSearchParams: vi.fn(),
}))
vi.mock('src/use/storage', () => ({useCookieStorage: vi.fn()}))
vi.mock('src/use/instruments', async () => ({
  ...(await vi.importActual<typeof import('src/use/instruments')>('src/use/instruments')),
  createSplendidGrandPiano: vi.fn(),
}))
vi.mock('src/components/midi-player', async () => ({
  ...(await vi.importActual<typeof import('src/components/midi-player')>(
    'src/components/midi-player',
  )),
  SHiddenPlayer: vi.fn(),
}))

const custom = [{id: 'custom', name: 'Custom', totalDuration: 1}]
const storageKey = 'coong__piano-musics-default'

function setup(initialPreset?: string, keepPlayList = true) {
  const [preset, setPreset] = createSignal(initialPreset)
  vi.mocked(useSearchParams).mockReturnValue([
    {
      get preset() {
        return preset()
      },
    },
    vi.fn(),
  ])
  vi.mocked(useCookieStorage).mockReturnValue([
    () => ({keepPlayList, pianoSize: 100, showKeyName: false}),
    vi.fn(),
  ])
  let player!: MidiPlayerContextProps
  const Probe = () => {
    player = useMidiPlayer()
    return null
  }
  const view = render(() => (
    <MusicLayout params={{}} location={useLocation()} data={undefined}>
      <Probe />
    </MusicLayout>
  ))
  return {
    get player() {
      return player
    },
    setPreset,
    ...view,
  }
}

describe('MusicLayout playlist persistence', () => {
  beforeEach(() => {
    localStorage.setItem(storageKey, JSON.stringify(custom))
    vi.mocked(useLocation).mockReturnValue({pathname: '/piano'} as ReturnType<typeof useLocation>)
    vi.mocked(useNavigate).mockReturnValue(vi.fn())
    vi.mocked(createSplendidGrandPiano).mockReturnValue([
      () => ({loaded: true, playingId: ''}),
      {},
    ] as ReturnType<typeof createSplendidGrandPiano>)
  })
  afterEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
  })

  it('should preserve stored music on direct preset entry and restore it on exit', async () => {
    const view = setup('hidden-teenieping')
    await waitFor(() =>
      expect(view.player.playList().map((music) => music.id)).toEqual(
        getPresetData('hidden-teenieping').musics.map((music) => music.id),
      ),
    )
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(custom)
    view.player.handleDelete(view.player.playList()[0].id)
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(custom)
    view.setPreset(undefined)
    await waitFor(() => expect(view.player.playList()).toEqual(custom))
    view.player.handleAddPlayItem([{id: 'added', name: 'Added', totalDuration: 1}])
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toHaveLength(2)
  })

  it('should react to preset navigation and restore the custom playlist for unknown presets', async () => {
    const view = setup()
    await waitFor(() => expect(view.player.playList()).toEqual(custom))
    view.setPreset('hidden-teenieping')
    await waitFor(() =>
      expect(view.player.playList().map((music) => music.id)).toEqual(
        getPresetData('hidden-teenieping').musics.map((music) => music.id),
      ),
    )
    view.setPreset('unknown')
    await waitFor(() => expect(view.player.playList()).toEqual(custom))
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(custom)
  })

  it('should retain stored music across preset unmount and a fresh normal entry', async () => {
    const preset = setup('hidden-teenieping')
    await waitFor(() =>
      expect(preset.player.playList().map((music) => music.id)).toEqual(
        getPresetData('hidden-teenieping').musics.map((music) => music.id),
      ),
    )
    preset.unmount()
    const normal = setup()
    await waitFor(() => expect(normal.player.playList()).toEqual(custom))
  })

  it('should ignore a preset response after navigating away before it resolves', async () => {
    const view = setup('hidden-teenieping')
    view.setPreset(undefined)
    await Promise.resolve()
    await Promise.resolve()
    expect(view.player.playList()).toEqual(custom)
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(custom)
  })

  it('should keep an empty edited preset separate from the saved playlist', async () => {
    const view = setup('hidden-teenieping')
    await waitFor(() =>
      expect(view.player.playList()).toHaveLength(getPresetData('hidden-teenieping').musics.length),
    )
    for (const music of view.player.playList()) {
      view.player.handleDelete(music.id)
    }
    expect(view.player.playList()).toEqual([])
    const added = {id: 'preset-added', name: 'Preset addition', totalDuration: 1}
    view.player.handleAddPlayItem([added])
    expect(view.player.playList()).toEqual([added])
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(custom)
    view.setPreset(undefined)
    await waitFor(() => expect(view.player.playList()).toEqual(custom))
  })

  it('should restore an unsaved playlist when persistence is disabled', async () => {
    const view = setup(undefined, false)
    view.player.handleAddPlayItem(custom)
    view.setPreset('hidden-teenieping')
    await waitFor(() =>
      expect(view.player.playList().map((music) => music.id)).toEqual(
        getPresetData('hidden-teenieping').musics.map((music) => music.id),
      ),
    )
    view.setPreset(undefined)
    await waitFor(() => expect(view.player.playList()).toEqual(custom))
    expect(JSON.parse(localStorage.getItem(storageKey)!)).toEqual(custom)
  })
})
