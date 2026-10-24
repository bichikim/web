/** @vitest-environment jsdom */

import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import {CustomAlbumCoverCropCanvas} from '../CustomAlbumCoverCropCanvas'
import type {CropFrame, CustomAlbumCoverCropController} from '../use-custom-album-cover-crop'

vi.mock('src/features/custom-albums', async () => {
  const model = await vi.importActual<typeof import('src/features/custom-albums/model')>(
    'src/features/custom-albums/model',
  )
  return model
})

const frame: CropFrame = {
  cropSize: 256,
  cropX: 128,
  cropY: 128,
  imageHeight: 512,
  imageWidth: 512,
  imageX: 0,
  imageY: 0,
  maximumCropSize: 512,
  maxX: 128,
  maxY: 128,
  source: 'blob:album-cover',
  sourceSize: 512,
  sourceX: 256,
  sourceY: 256,
}

const createController = (): CustomAlbumCoverCropController => ({
  errorMessage: () => null,
  handleCrop: vi.fn(),
  handleHorizontalPositionInput: vi.fn(),
  handleOpenChange: vi.fn(),
  handlePointerDown: vi.fn(),
  handlePointerEnd: vi.fn(),
  handlePointerMove: vi.fn(),
  handleResizeKeyDown: () => vi.fn(),
  handleSelectionKeyDown: vi.fn(),
  handleVerticalPositionInput: vi.fn(),
  handleZoomInput: vi.fn(),
  imageFrame: () => frame,
  isCropping: () => false,
  isLoading: () => false,
  position: () => ({x: 0, y: 0}),
  zoom: () => 2,
})

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it.each(['pointerup', 'pointercancel', 'lostpointercapture'])(
  'should forward the original %s event so only its pointer gesture ends',
  (eventName) => {
    const crop = createController()
    render(() => <CustomAlbumCoverCropCanvas crop={crop} frame={frame} />)
    const canvas = screen.getByRole('group', {name: m.album_custom_cover_crop_canvas()})
    const event = Object.assign(new Event(eventName, {bubbles: true}), {pointerId: 19})

    fireEvent(canvas, event)

    expect(crop.handlePointerEnd).toHaveBeenCalledExactlyOnceWith(event)
  },
)
