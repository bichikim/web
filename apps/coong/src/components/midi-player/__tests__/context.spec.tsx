/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'
import {type MidiPlayerContextProps, MidiPlayerProvider, useMidiPlayer} from '../context'
import type {MusicInfo} from '../SFileItem'
import type {SplendidGrandPianoController, SplendidGrandPianoState} from 'src/use/instruments'

const createMusic = (id: string): MusicInfo => ({id, name: id, totalDuration: 1})

const renderPlayer = (ids: string[]) => {
  const [musics, setMusics] = createSignal(ids.map(createMusic))
  const [state, setState] = createSignal<SplendidGrandPianoState>({
    leftTime: 0,
    loaded: true,
    playedTime: 0,
    playingId: '',
    startedAt: 0,
    suspended: false,
    totalDuration: 0,
  })
  const controller = {
    addEventListener: vi.fn(),
    down: vi.fn(),
    play: vi.fn((music: MusicInfo) => {
      setState((previous) => ({
        ...previous,
        leftTime: 0.5,
        playedTime: 0.5,
        playingId: music.id,
        totalDuration: music.totalDuration,
      }))
    }),
    removeEventListener: vi.fn(),
    resume: vi.fn(),
    seek: vi.fn(),
    stop: vi.fn(() => {
      setState((previous) => ({...previous, playingId: '', suspended: false}))
    }),
    suspend: vi.fn(() => {
      setState((previous) => ({...previous, suspended: true}))
    }),
    up: vi.fn(),
  } satisfies SplendidGrandPianoController
  const onMusicsChange = vi.fn((next: MusicInfo[]) => setMusics(next))
  let player!: MidiPlayerContextProps
  const Consumer = () => {
    player = useMidiPlayer()

    return null
  }

  render(() => (
    <MidiPlayerProvider
      initMusics={musics()}
      onMusicsChange={onMusicsChange}
      pianoController={controller}
      playState={state()}
    >
      <Consumer />
    </MidiPlayerProvider>
  ))

  return {controller, onMusicsChange, player}
}

describe('MidiPlayerProvider', () => {
  it.each([
    {ids: ['first', 'second'], remaining: 'second', selected: 'first', suspended: false},
    {ids: ['first', 'second'], remaining: 'second', selected: 'second', suspended: false},
    {ids: ['first', 'second'], remaining: 'second', selected: 'first', suspended: true},
    {ids: ['first'], remaining: '', selected: 'first', suspended: false},
  ])(
    'should stop deleted playback with $selected selected and suspended=$suspended ($ids)',
    ({ids, selected, suspended, remaining}) => {
      const {controller, onMusicsChange, player} = renderPlayer(ids)

      player.handlePlay('first')
      player.handleSelect(selected)
      if (suspended) {
        player.handleSuspend()
      }
      expect(player.playingId()).toBe('first')
      expect(player.isSuspend()).toBe(suspended)

      player.handleDelete('first')

      expect(controller.stop).toHaveBeenCalledExactlyOnceWith()
      expect(controller.play).toHaveBeenCalledExactlyOnceWith(createMusic('first'))
      expect(player.playingId()).toBe('')
      expect(player.isPlaying()).toBe(false)
      expect(player.isSuspend()).toBe(false)
      expect(player.selectedId()).toBe(remaining)
      expect(player.playList().map((music) => music.id)).toEqual(ids.slice(1))
      expect(onMusicsChange).toHaveBeenCalledExactlyOnceWith(ids.slice(1).map(createMusic))
    },
  )

  it('should preserve playback when deleting a different selected song', () => {
    const {controller, player} = renderPlayer(['first', 'second'])

    player.handlePlay('first')
    player.handleSelect('second')
    player.handleDelete('second')

    expect(controller.stop).not.toHaveBeenCalled()
    expect(player.playingId()).toBe('first')
    expect(player.isPlaying()).toBe(true)
    expect(player.selectedId()).toBe('first')
    expect(player.playList()).toEqual([createMusic('first')])
  })

  it('should ignore deletion of a missing song', () => {
    const {controller, onMusicsChange, player} = renderPlayer(['first'])

    player.handlePlay('first')
    player.handleDelete('missing')

    expect(controller.stop).not.toHaveBeenCalled()
    expect(onMusicsChange).not.toHaveBeenCalled()
    expect(player.playingId()).toBe('first')
    expect(player.playList()).toEqual([createMusic('first')])
  })

  it('should reconcile the playlist and selection when input musics change', () => {
    const [musics, setMusics] = createSignal([createMusic('first')])

    const Consumer = () => {
      const player = useMidiPlayer()

      return (
        <>
          <span data-testid="playlist">
            {player
              .playList()
              .map((music) => music.id)
              .join(',')}
          </span>
          <span data-testid="selected">{player.selectedId()}</span>
        </>
      )
    }

    render(() => (
      <MidiPlayerProvider initMusics={musics()}>
        <Consumer />
      </MidiPlayerProvider>
    ))

    expect(screen.getByTestId('playlist')).toHaveTextContent('first')
    expect(screen.getByTestId('selected')).toHaveTextContent('first')

    setMusics([createMusic('second')])
    expect(screen.getByTestId('playlist')).toHaveTextContent('second')
    expect(screen.getByTestId('selected')).toHaveTextContent('second')

    setMusics([])
    expect(screen.getByTestId('playlist')).toHaveTextContent('')
    expect(screen.getByTestId('selected')).toHaveTextContent('')
  })
})
