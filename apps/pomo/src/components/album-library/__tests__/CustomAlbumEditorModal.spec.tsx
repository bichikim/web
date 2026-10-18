/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen, waitFor, within} from '@solidjs/testing-library'
import {afterEach, beforeEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'

const mocks = vi.hoisted(() => ({
  addCustomAlbumTracks: vi.fn(),
  bitmap: {close: vi.fn(), height: 1024, width: 1024},
  cropCustomAlbumImage: vi.fn(),
  readCustomAlbumDraft: vi.fn(),
  saveCustomAlbum: vi.fn(),
}))

vi.mock('src/features/custom-albums', async (importOriginal) => ({
  ...(await importOriginal<typeof import('src/features/custom-albums')>()),
  ...mocks,
}))

vi.mock('../use-custom-album-cover-image', () => ({
  useCustomAlbumCoverImage: (props: {readonly file: File; readonly isOpen: boolean}) => ({
    errorMessage: () => null,
    imageBitmap: () => (props.isOpen ? (mocks.bitmap as unknown as ImageBitmap) : null),
    isLoading: () => false,
    previewUrl: () => (props.isOpen ? 'blob:cover' : null),
  }),
}))

import {cropCustomAlbumImage} from 'src/features/custom-albums'
import {CustomAlbumEditorModal} from '../CustomAlbumEditorModal'

beforeEach(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe = vi.fn()
      disconnect = vi.fn()
    },
  )
})

afterEach(() => {
  cleanup()
  vi.resetAllMocks()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

it('should discard the pending crop when the nested modal is dismissed by its overlay', async () => {
  const addListener = vi.spyOn(document, 'addEventListener')
  const pending = Promise.withResolvers<Blob>()
  mocks.cropCustomAlbumImage.mockReturnValue(pending.promise)
  render(() => (
    <CustomAlbumEditorModal
      albumId={null}
      isOpen
      onOpenChange={vi.fn()}
      onSaved={async () => undefined}
    />
  ))

  fireEvent.change(screen.getByLabelText(m.album_custom_cover_add_image()), {
    target: {files: [new File(['cover'], 'cover.png', {type: 'image/png'})]},
  })
  const cropDialog = await screen.findByRole('dialog', {
    name: m.album_custom_cover_crop_title(),
  })
  const applyButton = await screen.findByRole('button', {
    name: m.album_custom_cover_crop_apply(),
  })
  await waitFor(() => expect(applyButton).toBeEnabled())

  fireEvent.click(applyButton)
  expect(cropCustomAlbumImage).toHaveBeenCalledOnce()

  const cropControls = within(cropDialog)
  expect(cropControls.queryByRole('button', {name: m.common_close()})).not.toBeInTheDocument()
  expect(cropControls.getByRole('button', {name: m.album_custom_cancel()})).toBeDisabled()
  fireEvent.keyDown(cropDialog, {key: 'Escape'})
  expect(cropDialog).toBeInTheDocument()

  await waitFor(() =>
    expect(addListener).toHaveBeenCalledWith('pointerdown', expect.any(Function), true),
  )
  const overlay = cropDialog.parentElement?.firstElementChild
  expect(overlay).not.toBeNull()
  fireEvent.pointerDown(overlay!)
  fireEvent.pointerUp(overlay!)
  fireEvent.click(overlay!)

  await waitFor(() => expect(cropDialog).not.toBeInTheDocument())
  expect(screen.getByRole('dialog', {name: m.album_custom_create_title()})).toBeInTheDocument()

  pending.resolve(new Blob(['late crop'], {type: 'image/webp'}))
  await Promise.resolve()

  expect(screen.getByLabelText(m.album_custom_cover_add_image())).toBeInTheDocument()
  expect(screen.queryByLabelText(m.album_custom_cover_change_image())).not.toBeInTheDocument()
})
