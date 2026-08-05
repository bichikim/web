/**
 * @vitest-environment jsdom
 */
import {render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {describe, expect, it} from 'vitest'
import {MidiPlayerProvider, useMidiPlayer} from '../context'
import type {MusicInfo} from '../SFileItem'

const createMusic = (id: string): MusicInfo => ({id, name: id, totalDuration: 1})

describe('MidiPlayerProvider', () => {
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
