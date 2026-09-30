import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  type Setter,
} from 'solid-js'

import * as m from '@paraglide/message'
import {
  cropCustomAlbumImage,
  CUSTOM_ALBUM_COVER_EDGE,
  CustomAlbumError,
} from '../../features/custom-albums'
import {getCustomAlbumErrorMessage} from './custom-album-error-message'
import {useCustomAlbumCoverImage} from './use-custom-album-cover-image'

export const CUSTOM_COVER_ZOOM_PERCENT_BASE = 100
export const MINIMUM_CUSTOM_COVER_ZOOM_PERCENT = CUSTOM_COVER_ZOOM_PERCENT_BASE
export const MAXIMUM_CUSTOM_COVER_ZOOM_PERCENT = 300
export const CUSTOM_COVER_POSITION_PERCENT_MIDPOINT = 50
const CROP_KEYBOARD_STEP = 5

interface UseCustomAlbumCoverCropProps {
  readonly file: File
  readonly isOpen: boolean
  readonly onApply: (coverImage: Blob) => void
  readonly onCancel: () => void
}

interface CropPosition {
  readonly x: number
  readonly y: number
}

export interface CropFrame extends CropPosition {
  readonly cropSize: number
  readonly cropX: number
  readonly cropY: number
  readonly imageHeight: number
  readonly imageWidth: number
  readonly imageX: number
  readonly imageY: number
  readonly maximumCropSize: number
  readonly maxX: number
  readonly maxY: number
  readonly sourceSize: number
  readonly sourceX: number
  readonly sourceY: number
  readonly source: string
}

type CropHandle =
  | 'move'
  | 'north'
  | 'northeast'
  | 'northwest'
  | 'east'
  | 'southeast'
  | 'south'
  | 'southwest'
  | 'west'

interface CropPointerStart {
  readonly clientX: number
  readonly clientY: number
  readonly frame: CropFrame
  readonly handle: CropHandle
  readonly pointerX: number
  readonly pointerY: number
  readonly pointerId: number
  readonly position: CropPosition
}

type CropResizeDirection = -1 | 0 | 1

interface CropResizeAnchors {
  readonly horizontal: CropResizeDirection
  readonly maximumSize: number
  readonly vertical: CropResizeDirection
  readonly x: number
  readonly y: number
}

interface CropKeyboardSetters {
  readonly setPosition: Setter<CropPosition>
  readonly setZoom: Setter<number>
}

export interface CustomAlbumCoverCropController {
  readonly errorMessage: Accessor<string | null>
  readonly imageFrame: Accessor<CropFrame | null>
  readonly isCropping: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly position: Accessor<CropPosition>
  readonly zoom: Accessor<number>
  readonly handleCrop: () => Promise<void>
  readonly handleHorizontalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent>
  readonly handleOpenChange: (isOpen: boolean) => void
  readonly handlePointerDown: JSX.EventHandler<SVGSVGElement, PointerEvent>
  readonly handlePointerEnd: () => void
  readonly handlePointerMove: JSX.EventHandler<SVGSVGElement, PointerEvent>
  readonly handleResizeKeyDown: (
    handle: Exclude<CropHandle, 'move'>,
  ) => JSX.EventHandler<SVGCircleElement, KeyboardEvent>
  readonly handleSelectionKeyDown: JSX.EventHandler<SVGRectElement, KeyboardEvent>
  readonly handleVerticalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent>
  readonly handleZoomInput: JSX.EventHandler<HTMLInputElement, InputEvent>
}

const clampPosition = (value: number): number => Math.min(1, Math.max(-1, value))

const getCropFrame = (
  image: ImageBitmap,
  source: string,
  zoom: number,
  position: CropPosition,
): CropFrame => {
  const scale = Math.min(
    CUSTOM_ALBUM_COVER_EDGE / image.width,
    CUSTOM_ALBUM_COVER_EDGE / image.height,
  )
  const imageWidth = image.width * scale
  const imageHeight = image.height * scale
  const imageX = (CUSTOM_ALBUM_COVER_EDGE - imageWidth) / 2
  const imageY = (CUSTOM_ALBUM_COVER_EDGE - imageHeight) / 2
  const maximumCropSize = Math.min(imageWidth, imageHeight)
  const cropSize = maximumCropSize / zoom
  const maxX = Math.max(0, (imageWidth - cropSize) / 2)
  const maxY = Math.max(0, (imageHeight - cropSize) / 2)
  const cropX = imageX + maxX + position.x * maxX
  const cropY = imageY + maxY + position.y * maxY
  const sourceSize = cropSize / scale

  return {
    cropSize,
    cropX,
    cropY,
    imageHeight,
    imageWidth,
    imageX,
    imageY,
    maximumCropSize,
    maxX,
    maxY,
    source,
    sourceSize,
    sourceX: (cropX - imageX) / scale,
    sourceY: (cropY - imageY) / scale,
    x: position.x,
    y: position.y,
  }
}

const getCropHandle = (target: EventTarget | null): CropHandle | null => {
  if (!(target instanceof Element)) {
    return null
  }

  const handle = target.closest('[data-crop-handle]')?.getAttribute('data-crop-handle')

  return handle === 'move' ||
    handle === 'north' ||
    handle === 'northeast' ||
    handle === 'northwest' ||
    handle === 'east' ||
    handle === 'southeast' ||
    handle === 'south' ||
    handle === 'southwest' ||
    handle === 'west'
    ? handle
    : null
}

const getViewBoxPoint = (svg: SVGSVGElement, event: PointerEvent): CropPosition => {
  const bounds = svg.getBoundingClientRect()

  return {
    x: ((event.clientX - bounds.left) * CUSTOM_ALBUM_COVER_EDGE) / bounds.width,
    y: ((event.clientY - bounds.top) * CUSTOM_ALBUM_COVER_EDGE) / bounds.height,
  }
}

const getPositionForSelection = (
  frame: CropFrame,
  selection: {readonly size: number; readonly x: number; readonly y: number},
): CropPosition => {
  const maxX = Math.max(0, (frame.imageWidth - selection.size) / 2)
  const maxY = Math.max(0, (frame.imageHeight - selection.size) / 2)

  return {
    x: maxX === 0 ? 0 : clampPosition((selection.x - (frame.imageX + maxX)) / maxX),
    y: maxY === 0 ? 0 : clampPosition((selection.y - (frame.imageY + maxY)) / maxY),
  }
}

const getAxisAnchor = (direction: CropResizeDirection, start: number, end: number): number =>
  direction < 0 ? end : direction > 0 ? start : (start + end) / 2

const getAxisAvailableSize = (
  direction: CropResizeDirection,
  anchor: number,
  start: number,
  end: number,
): number =>
  direction < 0
    ? anchor - start
    : direction > 0
      ? end - anchor
      : 2 * Math.min(anchor - start, end - anchor)

const getCropResizeAnchors = (
  frame: CropFrame,
  handle: Exclude<CropHandle, 'move'>,
): CropResizeAnchors => {
  const left = frame.cropX
  const top = frame.cropY
  const right = left + frame.cropSize
  const bottom = top + frame.cropSize
  const imageRight = frame.imageX + frame.imageWidth
  const imageBottom = frame.imageY + frame.imageHeight
  const horizontal = handle.includes('west') ? -1 : handle.includes('east') ? 1 : 0
  const vertical = handle.includes('north') ? -1 : handle.includes('south') ? 1 : 0
  const x = getAxisAnchor(horizontal, left, right)
  const y = getAxisAnchor(vertical, top, bottom)

  return {
    horizontal,
    maximumSize: Math.min(
      getAxisAvailableSize(horizontal, x, frame.imageX, imageRight),
      getAxisAvailableSize(vertical, y, frame.imageY, imageBottom),
    ),
    vertical,
    x,
    y,
  }
}

const getCropResizeCandidateSize = (anchors: CropResizeAnchors, pointer: CropPosition): number => {
  const horizontalSize =
    anchors.horizontal === 0
      ? null
      : anchors.horizontal < 0
        ? anchors.x - pointer.x
        : pointer.x - anchors.x
  const verticalSize =
    anchors.vertical === 0
      ? null
      : anchors.vertical < 0
        ? anchors.y - pointer.y
        : pointer.y - anchors.y

  return Math.max(
    0,
    horizontalSize ?? Number.NEGATIVE_INFINITY,
    verticalSize ?? Number.NEGATIVE_INFINITY,
  )
}

const getCropResizeOrigin = (
  direction: CropResizeDirection,
  anchor: number,
  size: number,
): number => (direction < 0 ? anchor - size : direction > 0 ? anchor : anchor - size / 2)

const getCropResizePointer = (
  frame: CropFrame,
  handle: Exclude<CropHandle, 'move'>,
): CropPosition => ({
  x: handle.includes('west')
    ? frame.cropX
    : handle.includes('east')
      ? frame.cropX + frame.cropSize
      : frame.cropX + frame.cropSize / 2,
  y: handle.includes('north')
    ? frame.cropY
    : handle.includes('south')
      ? frame.cropY + frame.cropSize
      : frame.cropY + frame.cropSize / 2,
})

const getKeyboardDelta = (key: string): CropPosition | null => {
  switch (key) {
    case 'ArrowDown':
      return {x: 0, y: CROP_KEYBOARD_STEP}
    case 'ArrowLeft':
      return {x: -CROP_KEYBOARD_STEP, y: 0}
    case 'ArrowRight':
      return {x: CROP_KEYBOARD_STEP, y: 0}
    case 'ArrowUp':
      return {x: 0, y: -CROP_KEYBOARD_STEP}
    default:
      return null
  }
}

const getCropResizeKeyboardDelta = (
  handle: Exclude<CropHandle, 'move'>,
  key: string,
): CropPosition | null => {
  const delta = getKeyboardDelta(key)

  if (delta === null) {
    return null
  }

  const horizontal = handle.includes('west') ? -1 : handle.includes('east') ? 1 : 0
  const vertical = handle.includes('north') ? -1 : handle.includes('south') ? 1 : 0

  if (horizontal === 0 || vertical === 0) {
    return {x: horizontal === 0 ? 0 : delta.x, y: vertical === 0 ? 0 : delta.y}
  }

  const isExpanding = delta.x * horizontal + delta.y * vertical > 0
  const sizeDelta = isExpanding ? CROP_KEYBOARD_STEP : -CROP_KEYBOARD_STEP

  return {x: horizontal * sizeDelta, y: vertical * sizeDelta}
}

const resizeCropSelection = (
  frame: CropFrame,
  handle: Exclude<CropHandle, 'move'>,
  pointer: CropPosition,
): {readonly size: number; readonly x: number; readonly y: number} => {
  const anchors = getCropResizeAnchors(frame, handle)
  const minimumSize = Math.min(
    frame.maximumCropSize * (MINIMUM_CUSTOM_COVER_ZOOM_PERCENT / MAXIMUM_CUSTOM_COVER_ZOOM_PERCENT),
    anchors.maximumSize,
  )
  const size = Math.min(
    anchors.maximumSize,
    Math.max(minimumSize, getCropResizeCandidateSize(anchors, pointer)),
  )

  return {
    size,
    x: getCropResizeOrigin(anchors.horizontal, anchors.x, size),
    y: getCropResizeOrigin(anchors.vertical, anchors.y, size),
  }
}

const moveCropSelectionWithKeyboard = (
  event: KeyboardEvent,
  frame: CropFrame,
  setPosition: Setter<CropPosition>,
): void => {
  const delta = getKeyboardDelta(event.key)

  if (delta === null) {
    return
  }

  event.preventDefault()
  setPosition((current) => ({
    x: frame.maxX === 0 ? 0 : clampPosition(current.x + delta.x / frame.maxX),
    y: frame.maxY === 0 ? 0 : clampPosition(current.y + delta.y / frame.maxY),
  }))
}

const resizeCropSelectionWithKeyboard = (
  event: KeyboardEvent,
  frame: CropFrame,
  handle: Exclude<CropHandle, 'move'>,
  setters: CropKeyboardSetters,
): void => {
  const delta = getCropResizeKeyboardDelta(handle, event.key)

  if (delta === null) {
    return
  }

  event.preventDefault()
  const pointer = getCropResizePointer(frame, handle)
  const selection = resizeCropSelection(frame, handle, {
    x: pointer.x + delta.x,
    y: pointer.y + delta.y,
  })

  setters.setPosition(getPositionForSelection(frame, selection))
  setters.setZoom(frame.maximumCropSize / selection.size)
}

const createSelectionKeyDownHandler =
  (
    imageFrame: Accessor<CropFrame | null>,
    setPosition: Setter<CropPosition>,
  ): JSX.EventHandler<SVGRectElement, KeyboardEvent> =>
  (event) => {
    const frame = imageFrame()

    if (frame !== null) {
      moveCropSelectionWithKeyboard(event, frame, setPosition)
    }
  }

const createResizeKeyDownHandler =
  (
    handle: Exclude<CropHandle, 'move'>,
    imageFrame: Accessor<CropFrame | null>,
    setters: CropKeyboardSetters,
  ): JSX.EventHandler<SVGCircleElement, KeyboardEvent> =>
  (event) => {
    const frame = imageFrame()

    if (frame !== null) {
      resizeCropSelectionWithKeyboard(event, frame, handle, setters)
    }
  }

export const useCustomAlbumCoverCrop = (
  props: UseCustomAlbumCoverCropProps,
): CustomAlbumCoverCropController => {
  const coverImage = useCustomAlbumCoverImage({file: props.file, isOpen: props.isOpen})
  const [cropErrorMessage, setCropErrorMessage] = createSignal<string | null>(null)
  const [isCropping, setIsCropping] = createSignal(false)
  const [zoom, setZoom] = createSignal(1)
  const [position, setPosition] = createSignal<CropPosition>({x: 0, y: 0})
  const errorMessage = createMemo(() => cropErrorMessage() ?? coverImage.errorMessage())
  const imageFrame = createMemo(() => {
    const image = coverImage.imageBitmap()
    const source = coverImage.previewUrl()

    return image === null || source === null
      ? null
      : getCropFrame(image, source, zoom(), position())
  })
  let pointerStart: CropPointerStart | null = null

  createEffect(() => {
    if (props.isOpen) {
      setPosition({x: 0, y: 0})
      setZoom(1)
    }
  })

  const handleZoomInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setZoom(event.currentTarget.valueAsNumber / CUSTOM_COVER_ZOOM_PERCENT_BASE)
  }

  const handleHorizontalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setPosition((current) => ({
      ...current,
      x: event.currentTarget.valueAsNumber / CUSTOM_COVER_POSITION_PERCENT_MIDPOINT - 1,
    }))
  }

  const handleVerticalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    setPosition((current) => ({
      ...current,
      y: event.currentTarget.valueAsNumber / CUSTOM_COVER_POSITION_PERCENT_MIDPOINT - 1,
    }))
  }

  const handlePointerDown: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    const frame = imageFrame()
    const handle = getCropHandle(event.target)

    if (event.button !== 0 || frame === null || handle === null) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()

    if (bounds.width <= 0 || bounds.height <= 0) {
      return
    }

    const pointer = getViewBoxPoint(event.currentTarget, event)
    event.currentTarget.setPointerCapture(event.pointerId)
    pointerStart = {
      clientX: event.clientX,
      clientY: event.clientY,
      frame,
      handle,
      pointerId: event.pointerId,
      pointerX: pointer.x,
      pointerY: pointer.y,
      position: position(),
    }
  }

  const handlePointerMove: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    const start = pointerStart
    if (start === null || start.pointerId !== event.pointerId) {
      return
    }

    const bounds = event.currentTarget.getBoundingClientRect()

    if (bounds.width <= 0 || bounds.height <= 0) {
      return
    }

    const deltaX = ((event.clientX - start.clientX) * CUSTOM_ALBUM_COVER_EDGE) / bounds.width
    const deltaY = ((event.clientY - start.clientY) * CUSTOM_ALBUM_COVER_EDGE) / bounds.height

    if (start.handle === 'move') {
      setPosition({
        x: start.frame.maxX === 0 ? 0 : clampPosition(start.position.x + deltaX / start.frame.maxX),
        y: start.frame.maxY === 0 ? 0 : clampPosition(start.position.y + deltaY / start.frame.maxY),
      })
      return
    }

    const selection = resizeCropSelection(start.frame, start.handle, {
      x: start.pointerX + deltaX,
      y: start.pointerY + deltaY,
    })

    setPosition(getPositionForSelection(start.frame, selection))
    setZoom(start.frame.maximumCropSize / selection.size)
  }

  const handlePointerEnd = () => {
    pointerStart = null
  }

  const keyboardSetters = {setPosition, setZoom}
  const handleSelectionKeyDown = createSelectionKeyDownHandler(imageFrame, setPosition)
  const handleResizeKeyDown = (handle: Exclude<CropHandle, 'move'>) =>
    createResizeKeyDownHandler(handle, imageFrame, keyboardSetters)

  const handleCrop = async () => {
    const image = coverImage.imageBitmap()
    const frame = imageFrame()

    if (image === null || frame === null || isCropping()) {
      return
    }

    setCropErrorMessage(null)
    setIsCropping(true)

    try {
      const croppedImage = await cropCustomAlbumImage({
        image,
        sourceSize: frame.sourceSize,
        sourceX: frame.sourceX,
        sourceY: frame.sourceY,
      })
      setIsCropping(false)
      props.onApply(croppedImage)
    } catch (error: unknown) {
      setCropErrorMessage(
        error instanceof CustomAlbumError
          ? getCustomAlbumErrorMessage(error)
          : m.album_custom_error_cover_invalid(),
      )
      setIsCropping(false)
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      props.onCancel()
    }
  }

  return {
    errorMessage,
    handleCrop,
    handleHorizontalPositionInput,
    handleOpenChange,
    handlePointerDown,
    handlePointerEnd,
    handlePointerMove,
    handleResizeKeyDown,
    handleSelectionKeyDown,
    handleVerticalPositionInput,
    handleZoomInput,
    imageFrame,
    isCropping,
    isLoading: coverImage.isLoading,
    position,
    zoom,
  }
}
