/**
 * @vitest-environment jsdom
 */
import {fireEvent, render, screen, waitFor} from '@solidjs/testing-library'
import {createSignal, type JSX} from 'solid-js'
import {beforeEach, describe, expect, it, vi} from 'vitest'
import MusicPage, {route as musicRoute} from '../musics'
import PianoPage, {route as pianoRoute} from '../piano'
import {MidiPlayerContext} from 'src/components/midi-player/context'
import {SettingContext} from 'src/components/midi-player'
import {SplendidGrandPianoContext} from 'src/use/instruments'
import {ToastContext} from '@winter-love/solid-components'
import {useStorage} from '@winter-love/solid-use'

vi.mock('@winter-love/solid-use', () => ({useStorage: vi.fn()}))
vi.mock('src/use/restore-scroll', () => ({useRestoreScroll: vi.fn()}))
vi.mock('src/components/instruments', () => ({
  SPiano: (props: {showKeyName?: boolean}) => (
    <div data-testid="piano" data-show-key-name={String(props.showKeyName)} />
  ),
}))
vi.mock('src/components/scale', () => ({
  SScale: (props: {children: JSX.Element; size: number}) => (
    <div data-testid="scale" data-size={props.size}>
      {props.children}
    </div>
  ),
}))

const fetchMock = vi.fn()
const handleAddPlayItem = vi.fn()
const setMessage = vi.fn()
const setShowAddMidisMessage = vi.fn()
const pianoController = {
  down: vi.fn(),
  up: vi.fn(),
}

const midiContext = {
  handleAddPlayItem,
} as never

describe('music routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.stubGlobal('fetch', fetchMock)
    fetchMock.mockResolvedValue({
      json: vi.fn().mockResolvedValue({musics: [{id: 'sample-midi'}]}),
    })
    vi.mocked(useStorage).mockReturnValue([() => true, setShowAddMidisMessage] as never)
  })

  it('should add fetched sample MIDI files from the music market', async () => {
    render(() => (
      <MidiPlayerContext.Provider value={midiContext}>
        <MusicPage />
      </MidiPlayerContext.Provider>
    ))

    fireEvent.click(screen.getByRole('button', {name: 'Get Sample Midi files'}))

    await waitFor(() => expect(handleAddPlayItem).toHaveBeenCalledWith([{id: 'sample-midi'}]))
    expect(fetchMock).toHaveBeenCalledWith('/api/preset/hidden-teenieping')
    expect(musicRoute.info.meta.title).toBe('MIDI File Market')
  })

  it('should render the configured piano and offer a sample MIDI toast action', async () => {
    const [pianoState] = createSignal({loaded: false})
    render(() => (
      <ToastContext.Provider value={{setMessage} as never}>
        <SettingContext.Provider value={() => ({pianoSize: 88, showKeyName: true})}>
          <SplendidGrandPianoContext.Provider
            value={[pianoState as never, pianoController as never]}
          >
            <MidiPlayerContext.Provider value={midiContext}>
              <PianoPage />
            </MidiPlayerContext.Provider>
          </SplendidGrandPianoContext.Provider>
        </SettingContext.Provider>
      </ToastContext.Provider>
    ))

    expect(screen.getByTestId('scale')).toHaveAttribute('data-size', '88')
    expect(screen.getByTestId('piano')).toHaveAttribute('data-show-key-name', 'true')
    expect(setMessage).toHaveBeenCalledWith(
      expect.objectContaining({id: 'piano-loading', message: expect.stringContaining('loading')}),
    )

    const addMessage = setMessage.mock.calls
      .map(([message]) => message)
      .find((message) => message.id === 'add-midis-message')
    const close = vi.fn()
    await addMessage.actions[0].action({close})

    expect(handleAddPlayItem).toHaveBeenCalledWith([{id: 'sample-midi'}])
    expect(setShowAddMidisMessage).toHaveBeenCalledWith(false)
    expect(close).toHaveBeenCalledOnce()
    expect(pianoRoute.info.meta.title).toBe('Piano')
  })
})
