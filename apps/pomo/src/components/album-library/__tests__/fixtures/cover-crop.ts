import type {Accessor} from 'solid-js'
import {vi} from 'vitest'
import type {CropFrame, CustomAlbumCoverCropController} from '../../use-custom-album-cover-crop'

export const CROP_FRAME: CropFrame = {
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
  source: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg"/>',
  sourceSize: 512,
  sourceX: 256,
  sourceY: 256,
}

export const createCropController = (
  frame: Accessor<CropFrame> = () => CROP_FRAME,
  isCropping: Accessor<boolean> = () => false,
): CustomAlbumCoverCropController => ({
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
  imageFrame: frame,
  isCropping,
  isLoading: () => false,
  position: () => ({x: 0, y: 0}),
  zoom: () => 2,
})
