import './CustomAlbumCoverCropCanvas.spec'
import {render, screen} from '@solidjs/testing-library'
import {createComponent, createSignal} from 'solid-js'
import {expect, it} from 'vitest'
import {userEvent} from 'vitest/browser'
import * as m from '@paraglide/message'
import {CustomAlbumCoverCropCanvas} from '../CustomAlbumCoverCropCanvas'
import {createCropController, CROP_FRAME} from './fixtures/cover-crop'

it('should retain native SVG geometry and keyboard delegation across frame updates', async () => {
  const [frame, setFrame] = createSignal(CROP_FRAME)
  const [cropping, setCropping] = createSignal(false)
  const crop = createCropController(frame, cropping)
  render(() =>
    createComponent(CustomAlbumCoverCropCanvas, {
      crop,
      get frame() {
        return frame()
      },
    }),
  )
  const canvas = screen.getByRole('group', {name: m.album_custom_cover_crop_canvas()})
  const selection = screen.getByRole('group', {
    name: m.album_custom_cover_crop_move_selection(),
  })
  const preview = screen.getByRole('img', {name: m.album_custom_cover_crop_preview()})
  if (!(selection instanceof SVGRectElement)) {
    throw new Error('Expected the crop selection to be an SVG rectangle')
  }
  expect(canvas).toHaveAttribute('viewBox', '0 0 512 512')
  expect(selection.getBBox().width).toBe(CROP_FRAME.cropSize)
  selection.focus()
  expect(selection).toHaveFocus()
  await userEvent.keyboard('{ArrowRight}')
  expect(crop.handleSelectionKeyDown).toHaveBeenCalledExactlyOnceWith(
    expect.objectContaining({key: 'ArrowRight'}),
  )

  setFrame({...CROP_FRAME, cropSize: 128, cropX: 64, cropY: 96})
  expect(screen.getByRole('group', {name: m.album_custom_cover_crop_move_selection()})).toBe(
    selection,
  )
  expect(selection).toHaveFocus()
  expect(selection.getBBox()).toMatchObject({height: 128, width: 128, x: 64, y: 96})
  expect(preview).toHaveAttribute('viewBox', '64 96 128 128')
  setCropping(true)
  expect(canvas).toHaveAttribute('aria-disabled', 'true')
})
