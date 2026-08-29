/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import type {JSX} from 'solid-js'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import type {PTrack} from '../../../features/focus-room-audio'

const componentMocks = vi.hoisted(() => ({
  content: vi.fn(),
  footer: vi.fn(),
  modal: vi.fn(),
}))
const reporterMocks = vi.hoisted(() => ({reportClientError: vi.fn()}))

vi.mock('../Content', () => ({default: componentMocks.content}))
vi.mock('../Footer', () => ({PlaylistFooter: componentMocks.footer}))
vi.mock('../../PModal', () => ({PModal: componentMocks.modal}))
vi.mock('../../../features/client-error-reporter', () => reporterMocks)

import {PAlbumLibraryPanel} from '../Panel'

interface ModalProps {
  readonly children: JSX.Element
  readonly description: string
  readonly footer?: JSX.Element
  readonly isOpen: boolean
  readonly onCloseAutoFocus: () => void
  readonly onOpenChange: (isOpen: boolean) => void
  readonly placement: string
  readonly size: string
  readonly title: string
}

interface ContentProps {
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
  readonly onPreviewEnd?: () => void
  readonly onPreviewStart?: (stopPreview: () => void) => void
  readonly tracks: readonly PTrack[]
}

beforeEach(() => {
  componentMocks.modal.mockImplementation((props: ModalProps) => (
    <section
      data-description={props.description}
      data-is-open={String(props.isOpen)}
      data-placement={props.placement}
      data-size={props.size}
      data-title={props.title}
    >
      <button onClick={props.onCloseAutoFocus} type="button">
        close autofocus
      </button>
      <button onClick={() => props.onOpenChange(false)} type="button">
        change open
      </button>
      {props.children}
      {props.footer}
    </section>
  ))
  componentMocks.footer.mockReturnValue(null)
  componentMocks.content.mockReturnValue(null)
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should contain a lazy album module failure inside the modal', async () => {
  const loadError = new Error('album module failed')
  componentMocks.content.mockImplementation(() => {
    throw loadError
  })

  render(() => (
    <PAlbumLibraryPanel
      isOpen
      onAddTracks={vi.fn()}
      onCloseAutoFocus={vi.fn()}
      onOpenChange={vi.fn()}
      tracks={[]}
    />
  ))

  expect(await screen.findByRole('alert')).toHaveTextContent('앨범을 불러오지 못했어요')
  expect(reporterMocks.reportClientError).toHaveBeenCalledWith(loadError, {
    feature: 'album-library',
    source: 'error-boundary',
  })
})

it('should clear a pending restore when content adds tracks', async () => {
  const currentTrack = {id: 'current'} as PTrack
  const addedTrack = {id: 'added'} as PTrack
  const onAddTracks = vi.fn()
  const onClearTracks = vi.fn()
  componentMocks.content.mockImplementation((props: ContentProps) => (
    <button onClick={() => props.onAddTracks([addedTrack])} type="button">
      add
    </button>
  ))

  render(() => (
    <PAlbumLibraryPanel
      isOpen
      onAddTracks={onAddTracks}
      onClearTracks={onClearTracks}
      onCloseAutoFocus={vi.fn()}
      onOpenChange={vi.fn()}
      tracks={[currentTrack]}
    />
  ))

  await screen.findByRole('button', {name: 'add'})
  const footerProps = componentMocks.footer.mock.lastCall?.[0] as {
    readonly clearedTrackCount: number
    readonly onClear: () => void
    readonly onRestore: () => void
  }
  footerProps.onRestore()
  expect(onAddTracks).not.toHaveBeenCalled()
  footerProps.onClear()
  expect(onClearTracks).toHaveBeenCalledOnce()

  const clearedFooterProps = componentMocks.footer.mock.lastCall?.[0] as {
    readonly clearedTrackCount: number
    readonly onRestore: () => void
  }
  expect(clearedFooterProps.clearedTrackCount).toBe(1)
  clearedFooterProps.onRestore()
  expect(onAddTracks).toHaveBeenCalledWith([currentTrack])

  footerProps.onClear()
  screen.getByRole('button', {name: 'add'}).click()

  expect(onAddTracks).toHaveBeenCalledWith([addedTrack])
  expect(componentMocks.footer.mock.lastCall?.[0]).toMatchObject({clearedTrackCount: 0})
})

it('should forward modal and optional preview contracts', async () => {
  const track = {id: 'track'} as PTrack
  const onCloseAutoFocus = vi.fn()
  const onOpenChange = vi.fn()
  const onPreviewEnd = vi.fn()
  const onPreviewStart = vi.fn()
  componentMocks.content.mockImplementation((props: ContentProps) => {
    props.onPreviewEnd?.()
    props.onPreviewStart?.(vi.fn())

    return <p>{props.tracks[0]?.id}</p>
  })

  render(() => (
    <PAlbumLibraryPanel
      isOpen
      onAddTracks={vi.fn()}
      onCloseAutoFocus={onCloseAutoFocus}
      onOpenChange={onOpenChange}
      onPreviewEnd={onPreviewEnd}
      onPreviewStart={onPreviewStart}
      tracks={[track]}
    />
  ))

  const modal = (await screen.findByText('track')).closest('section')

  expect(modal).toHaveAttribute(
    'data-description',
    '곡 하나씩 또는 앨범 전체를 플레이어에 담아보세요.',
  )
  expect(modal).toHaveAttribute('data-is-open', 'true')
  expect(modal).toHaveAttribute('data-placement', 'top')
  expect(modal).toHaveAttribute('data-size', 'full')
  expect(modal).toHaveAttribute('data-title', '앨범')
  screen.getByRole('button', {name: 'close autofocus'}).click()
  screen.getByRole('button', {name: 'change open'}).click()

  expect(onCloseAutoFocus).toHaveBeenCalledOnce()
  expect(onOpenChange).toHaveBeenCalledWith(false)
  expect(onPreviewEnd).toHaveBeenCalledOnce()
  expect(onPreviewStart).toHaveBeenCalledWith(expect.any(Function))
})

it('should ignore clear requests without both tracks and a clear callback', () => {
  const currentTrack = {id: 'current'} as PTrack
  const onClearTracks = vi.fn()
  const emptyView = render(() => (
    <PAlbumLibraryPanel
      isOpen
      onAddTracks={vi.fn()}
      onClearTracks={onClearTracks}
      onCloseAutoFocus={vi.fn()}
      onOpenChange={vi.fn()}
      tracks={[]}
    />
  ))

  const emptyFooterProps = componentMocks.footer.mock.lastCall?.[0] as {
    readonly onClear: () => void
  }
  emptyFooterProps.onClear()
  expect(onClearTracks).not.toHaveBeenCalled()
  emptyView.unmount()

  render(() => (
    <PAlbumLibraryPanel
      isOpen
      onAddTracks={vi.fn()}
      onCloseAutoFocus={vi.fn()}
      onOpenChange={vi.fn()}
      tracks={[currentTrack]}
    />
  ))
  const unavailableFooterProps = componentMocks.footer.mock.lastCall?.[0] as {
    readonly onClear: () => void
  }
  unavailableFooterProps.onClear()
  expect(onClearTracks).not.toHaveBeenCalled()
})
