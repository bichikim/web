/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import {PAlbumLibrary, type PAlbumLibraryProps} from '../PAlbumLibrary'

const focus = vi.fn()
const panelMocks = vi.hoisted(() => ({render: vi.fn()}))

interface PanelProps {
  readonly isOpen: boolean
  readonly onAddTracks: PAlbumLibraryProps['onAddTracks']
  readonly onClearTracks: PAlbumLibraryProps['onClearTracks']
  readonly onCloseAutoFocus: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly onPreviewEnd: PAlbumLibraryProps['onPreviewEnd']
  readonly onPreviewStart: PAlbumLibraryProps['onPreviewStart']
  readonly tracks: PAlbumLibraryProps['tracks']
}

vi.mock('../icon-style', () => ({
  getPomoIconClass: (icon: string, sceneStyle: unknown) => `${icon}:${String(sceneStyle)}`,
}))
vi.mock('../PPlayerUtilityButton', () => ({
  PPlayerUtilityButton: (props: {
    readonly accessibleLabel: string
    readonly icon: string
    readonly onPress: (source: HTMLButtonElement) => void
    readonly purpose: string
  }) => {
    Object.values(props)
    return (
      <button
        data-icon={props.icon}
        data-purpose={props.purpose}
        onClick={(event) => {
          Object.defineProperty(event.currentTarget, 'focus', {value: focus})
          props.onPress(event.currentTarget)
        }}
        type="button"
      >
        {props.accessibleLabel}
      </button>
    )
  },
}))
vi.mock('../album-library/Panel', () => ({PAlbumLibraryPanel: panelMocks.render}))

beforeEach(() => {
  panelMocks.render.mockImplementation((props: PanelProps) => {
    Object.values(props)
    props.onAddTracks(props.tracks)
    props.onClearTracks?.()
    props.onPreviewStart?.(() => undefined)
    props.onPreviewEnd?.()
    return (
      <div>
        <span>{String(props.isOpen)}</span>
        <button onClick={props.onCloseAutoFocus} type="button">
          focus
        </button>
        <button onClick={() => props.onOpenChange(false)} type="button">
          close
        </button>
      </div>
    )
  })
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should open the album panel, forward callbacks, restore focus, and close', () => {
  const onAddTracks = vi.fn()
  const onClearTracks = vi.fn()
  const onPreviewEnd = vi.fn()
  const onPreviewStart = vi.fn()
  const tracks = [{id: 'track'}] as unknown as PAlbumLibraryProps['tracks']

  render(() => (
    <PAlbumLibrary
      onAddTracks={onAddTracks}
      onClearTracks={onClearTracks}
      onPreviewEnd={onPreviewEnd}
      onPreviewStart={onPreviewStart}
      sceneStyle="scribble"
      tracks={tracks}
    />
  ))

  const trigger = screen.getByRole('button', {name: '앨범 추가'})
  expect(trigger).toHaveAttribute('data-icon', 'i-tabler-album:scribble')
  expect(trigger).toHaveAttribute('data-purpose', 'album')
  expect(screen.queryByText('true')).not.toBeInTheDocument()

  fireEvent.click(trigger)
  expect(screen.getByText('true')).toBeInTheDocument()
  expect(onAddTracks).toHaveBeenCalledWith(tracks)
  expect(onClearTracks).toHaveBeenCalledOnce()
  expect(onPreviewStart).toHaveBeenCalledWith(expect.any(Function))
  expect(onPreviewEnd).toHaveBeenCalledOnce()

  fireEvent.click(screen.getByRole('button', {name: 'focus'}))
  expect(focus).toHaveBeenCalledOnce()
  fireEvent.click(screen.getByRole('button', {name: 'close'}))
  expect(screen.queryByText('true')).not.toBeInTheDocument()
})

it('should support omitted optional callbacks and scene style', () => {
  render(() => <PAlbumLibrary onAddTracks={vi.fn()} tracks={[]} />)

  const trigger = screen.getByRole('button', {name: '앨범 추가'})
  expect(trigger).toHaveAttribute('data-icon', 'i-tabler-album:undefined')
  fireEvent.click(trigger)
  expect(screen.getByText('true')).toBeInTheDocument()
})
