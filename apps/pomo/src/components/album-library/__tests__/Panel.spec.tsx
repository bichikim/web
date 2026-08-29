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
  readonly footer?: JSX.Element
}

interface ContentProps {
  readonly onAddTracks: (tracks: readonly PTrack[]) => void
}

beforeEach(() => {
  componentMocks.modal.mockImplementation((props: ModalProps) => (
    <section>
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
  screen.getByRole('button', {name: 'add'}).click()

  expect(onAddTracks).toHaveBeenCalledWith([addedTrack])
  expect(componentMocks.footer.mock.lastCall?.[0]).toMatchObject({clearedTrackCount: 0})
})
