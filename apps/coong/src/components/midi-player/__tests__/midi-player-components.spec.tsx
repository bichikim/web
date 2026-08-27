/** @vitest-environment jsdom */

import {fireEvent, render, screen} from '@solidjs/testing-library'
import userEvent from '@testing-library/user-event'
import {useContext} from 'solid-js'
import {describe, expect, it, vi} from 'vitest'

import {MidiPlayerContext, MidiPlayerProvider} from '../context'
import {HDragExecute} from '../HDragExecute'
import {SClose} from '../SClose'
import {SHiddenPlayer} from '../SHiddenPlayer'
import {SMusicMore} from '../SMusicMore'
import {SPlayer} from '../SPlayer'
import {SPlayerController} from '../SPlayerController'
import {SProgress} from '../SProgress'
import {SSetting} from '../SSetting'
import {STypeIcon} from '../STypeIcon'

describe('midi player controls', () => {
  it('should expose playback, repeat, seek, link, and setting controls', async () => {
    const onPlay = vi.fn()
    const onStop = vi.fn()
    const onChangeRepeat = vi.fn()
    const onLink = vi.fn()
    const onSetting = vi.fn()
    const onSeek = vi.fn()
    render(() => (
      <SPlayerController
        onPlay={onPlay}
        onStop={onStop}
        onChangeRepeat={onChangeRepeat}
        onLink={onLink}
        onSetting={onSetting}
        onSeek={onSeek}
      />
    ))

    await fireEvent.click(screen.getByTitle('play'))
    await fireEvent.click(screen.getByTitle('stop'))
    await fireEvent.click(screen.getByTitle('repeat no'))
    await fireEvent.click(screen.getByTitle('piano'))
    await fireEvent.click(screen.getByTitle('setting'))
    const seeker = screen.getByTitle('seek')
    vi.spyOn(seeker, 'getBoundingClientRect').mockReturnValue({
      bottom: 0,
      height: 10,
      left: 0,
      right: 100,
      toJSON: vi.fn(),
      top: 0,
      width: 100,
      x: 0,
      y: 0,
    })
    await fireEvent.click(seeker, {pageX: 50})

    expect(onPlay).toHaveBeenCalledWith('')
    expect(onStop).toHaveBeenCalledOnce()
    expect(onChangeRepeat).toHaveBeenCalledWith('one')
    expect(onLink).toHaveBeenCalledWith('piano')
    expect(onSetting).toHaveBeenCalledOnce()
    expect(onSeek).toHaveBeenCalled()
    expect(screen.getByLabelText('Midi file input')).toHaveAttribute('multiple')
  })

  it('should render playlist items and report selection', async () => {
    const onSelect = vi.fn()
    render(() => (
      <SPlayerController
        playList={[{ext: 'midi', id: 'song-1', name: 'First song', totalDuration: 10}]}
        selectedId=""
        onSelect={onSelect}
      />
    ))

    const item = screen.getByRole('listitem', {name: 'First song'})
    await userEvent.click(item)

    expect(onSelect).toHaveBeenCalledWith('song-1')
    expect(screen.getByText('midi')).toBeInTheDocument()
  })

  it('should execute a drag action after crossing its threshold', async () => {
    const onLeftExecute = vi.fn()
    render(() => (
      <HDragExecute dragEndSize={100} dragExecuteSize={50} onLeftExecute={onLeftExecute}>
        draggable
      </HDragExecute>
    ))
    const button = screen.getByRole('button', {name: 'draggable'})

    await fireEvent.mouseDown(button, {clientX: 0, clientY: 0})
    await fireEvent.mouseMove(button, {clientX: 70, clientY: 0})
    await fireEvent.mouseUp(button, {clientX: 70, clientY: 0})

    expect(onLeftExecute).toHaveBeenCalledOnce()
  })

  it('should render common close, progress, type, and passthrough presentation', async () => {
    const onClose = vi.fn()
    render(() => (
      <>
        <SClose isHidden playedTime={5} totalTime={10} onClose={onClose} />
        <SProgress data-testid="progress" progress={25} selected />
        <STypeIcon name="midi" />
        <SMusicMore>more music</SMusicMore>
      </>
    ))

    await fireEvent.click(screen.getByTitle('open midi player'))

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.getByTestId('progress').firstElementChild).toHaveStyle({width: '25%'})
    expect(screen.getByText('midi')).toHaveClass('bg-blue-400')
    expect(screen.getByText('more music')).toBeInTheDocument()
  })
})

describe('MidiPlayerProvider', () => {
  it('should add, select, repeat, and delete playlist items', async () => {
    const onMusicsChange = vi.fn()
    const Consumer = () => {
      const player = useContext(MidiPlayerContext)
      return (
        <>
          <output>{`${player.playList().length}:${player.selectedId()}:${player.repeat()}`}</output>
          <button
            onClick={() =>
              player.handleAddPlayItem([{id: 'song-1', name: 'Song', totalDuration: 10}])
            }
          >
            add
          </button>
          <button onClick={() => player.handleChangeRepeat('all')}>repeat</button>
          <button onClick={() => player.handleDelete('song-1')}>delete</button>
        </>
      )
    }
    render(() => (
      <MidiPlayerProvider onMusicsChange={onMusicsChange}>
        <Consumer />
      </MidiPlayerProvider>
    ))

    await fireEvent.click(screen.getByRole('button', {name: 'add'}))
    expect(screen.getByText('1:song-1:no')).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', {name: 'repeat'}))
    expect(screen.getByText('1:song-1:all')).toBeInTheDocument()
    await fireEvent.click(screen.getByRole('button', {name: 'delete'}))
    expect(screen.getByText('0::all')).toBeInTheDocument()
    expect(onMusicsChange).toHaveBeenCalledTimes(2)
  })

  it('should wire the default context into the player shell', () => {
    render(() => <SPlayer />)

    expect(screen.getByTitle('play')).toBeInTheDocument()
    expect(screen.getByTitle('seek')).toBeInTheDocument()
  })

  it('should reveal and hide the resizable player surface', async () => {
    render(() => <SHiddenPlayer />)
    const surface = screen.getByLabelText('midi player')

    expect(surface).toHaveAttribute('aria-hidden', 'true')
    await fireEvent.click(screen.getByTitle('open midi player'))
    expect(surface).toHaveAttribute('aria-hidden', 'false')
    await fireEvent.click(screen.getByTitle('close midi player'))
    expect(surface).toHaveAttribute('aria-hidden', 'true')
  })
})

describe('SSetting', () => {
  it('should report switch, slider, and close interactions', async () => {
    const onSettingDataChange = vi.fn()
    const onClose = vi.fn()
    render(() => (
      <SSetting
        settingData={{keepPlayList: true, pianoSize: 80, showKeyName: false}}
        onSettingDataChange={onSettingDataChange}
        onClose={onClose}
      />
    ))

    await fireEvent.click(screen.getByLabelText('Show key name'))
    await fireEvent.input(screen.getByLabelText('Piano Size'), {target: {value: '70'}})
    await fireEvent.click(screen.getAllByRole('button').at(-1) as HTMLButtonElement)

    expect(onSettingDataChange).toHaveBeenCalledWith(expect.objectContaining({showKeyName: true}))
    expect(onSettingDataChange).toHaveBeenCalledWith(expect.objectContaining({pianoSize: 70}))
    expect(onClose).toHaveBeenCalledOnce()
  })
})
