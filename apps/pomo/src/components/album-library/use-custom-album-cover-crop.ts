import type {Point} from '@winter-love/utils/core/types/shared'
import {
  type Accessor,
  createEffect,
  createMemo,
  createSignal,
  type JSX,
  on,
  onCleanup,
  untrack,
} from 'solid-js'

import * as m from '@paraglide/message'
import {
  type SquareCropFrame,
  type SquareCropHandle,
  type SquareCropResizeHandle,
  useSquareCrop,
} from 'src/hooks/use-square-crop'
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

interface UseCustomAlbumCoverCropProps {
  readonly file: File
  readonly isOpen: boolean
  readonly onApply: (coverImage: Blob) => void
  readonly onCancel: () => void
}

export interface CropFrame extends SquareCropFrame {
  readonly source: string
}

export interface CustomAlbumCoverCropController {
  readonly errorMessage: Accessor<string | null>
  readonly imageFrame: Accessor<CropFrame | null>
  readonly isCropping: Accessor<boolean>
  readonly isLoading: Accessor<boolean>
  readonly position: Accessor<Point>
  readonly zoom: Accessor<number>
  readonly handleCrop: () => Promise<void>
  readonly handleHorizontalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent>
  readonly handleOpenChange: (isOpen: boolean) => void
  readonly handlePointerDown: JSX.EventHandler<SVGSVGElement, PointerEvent>
  readonly handlePointerEnd: (event?: PointerEvent) => void
  readonly handlePointerMove: JSX.EventHandler<SVGSVGElement, PointerEvent>
  readonly handleResizeKeyDown: (
    handle: SquareCropResizeHandle,
  ) => JSX.EventHandler<SVGCircleElement, KeyboardEvent>
  readonly handleSelectionKeyDown: JSX.EventHandler<SVGRectElement, KeyboardEvent>
  readonly handleVerticalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent>
  readonly handleZoomInput: JSX.EventHandler<HTMLInputElement, InputEvent>
}

const getCropHandle = (target: EventTarget | null): SquareCropHandle | null => {
  if (!(target instanceof Element)) {
    return null
  }
  const handle = target.closest('[data-crop-handle]')?.getAttribute('data-crop-handle')
  switch (handle) {
    case 'move':
    case 'north':
    case 'northeast':
    case 'northwest':
    case 'east':
    case 'southeast':
    case 'south':
    case 'southwest':
    case 'west':
      return handle
    default:
      return null
  }
}

const getViewBoxPoint = (svg: SVGSVGElement, event: PointerEvent): Point | null => {
  const bounds = svg.getBoundingClientRect()
  if (bounds.width <= 0 || bounds.height <= 0) {
    return null
  }
  return {
    x: ((event.clientX - bounds.left) * CUSTOM_ALBUM_COVER_EDGE) / bounds.width,
    y: ((event.clientY - bounds.top) * CUSTOM_ALBUM_COVER_EDGE) / bounds.height,
  }
}

export const useCustomAlbumCoverCrop = (
  props: UseCustomAlbumCoverCropProps,
): CustomAlbumCoverCropController => {
  const coverImage = useCustomAlbumCoverImage({
    get file() {
      return props.file
    },
    get isOpen() {
      return props.isOpen
    },
  })
  const crop = useSquareCrop({
    image: coverImage.imageBitmap,
    viewport: () => ({height: CUSTOM_ALBUM_COVER_EDGE, width: CUSTOM_ALBUM_COVER_EDGE}),
    zoomLimits: () => ({
      maximum: MAXIMUM_CUSTOM_COVER_ZOOM_PERCENT / CUSTOM_COVER_ZOOM_PERCENT_BASE,
      minimum: MINIMUM_CUSTOM_COVER_ZOOM_PERCENT / CUSTOM_COVER_ZOOM_PERCENT_BASE,
    }),
  })
  const [cropErrorMessage, setCropErrorMessage] = createSignal<string | null>(null)
  const [isCropping, setIsCropping] = createSignal(false)
  const errorMessage = createMemo(() => cropErrorMessage() ?? coverImage.errorMessage())
  const imageFrame = createMemo(() => {
    const frame = crop.frame()
    const source = coverImage.previewUrl()
    return frame === null || source === null ? null : {...frame, source}
  })

  let cropOperationVersion = 0

  createEffect(
    on([() => props.file, () => props.isOpen], ([, isOpen]) => {
      if (isOpen) {
        untrack(crop.reset)
      } else {
        untrack(crop.endGesture)
      }
      setIsCropping(false)
      onCleanup(() => {
        cropOperationVersion += 1
      })
    }),
  )

  const handleZoomInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    crop.changeZoom(event.currentTarget.valueAsNumber / CUSTOM_COVER_ZOOM_PERCENT_BASE)
  }

  const handleHorizontalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    crop.moveTo({
      ...crop.position(),
      x: event.currentTarget.valueAsNumber / CUSTOM_COVER_POSITION_PERCENT_MIDPOINT - 1,
    })
  }

  const handleVerticalPositionInput: JSX.EventHandler<HTMLInputElement, InputEvent> = (event) => {
    crop.moveTo({
      ...crop.position(),
      y: event.currentTarget.valueAsNumber / CUSTOM_COVER_POSITION_PERCENT_MIDPOINT - 1,
    })
  }

  const handlePointerDown: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    const handle = getCropHandle(event.target)
    if (event.button !== 0 || imageFrame() === null || handle === null) {
      return
    }
    const point = getViewBoxPoint(event.currentTarget, event)
    if (point !== null && crop.beginGesture({handle, point, pointerId: event.pointerId})) {
      event.currentTarget.setPointerCapture(event.pointerId)
    }
  }

  const handlePointerMove: JSX.EventHandler<SVGSVGElement, PointerEvent> = (event) => {
    const point = getViewBoxPoint(event.currentTarget, event)
    if (point !== null) {
      crop.moveGesture({point, pointerId: event.pointerId})
    }
  }

  const handlePointerEnd = (event?: PointerEvent): void => {
    crop.endGesture(event?.pointerId)
  }

  const handleSelectionKeyDown: JSX.EventHandler<SVGRectElement, KeyboardEvent> = (event) => {
    if (crop.moveWithKeyboard(event.key)) {
      event.preventDefault()
    }
  }

  const handleResizeKeyDown =
    (handle: SquareCropResizeHandle): JSX.EventHandler<SVGCircleElement, KeyboardEvent> =>
    (event) => {
      if (crop.resizeWithKeyboard(handle, event.key)) {
        event.preventDefault()
      }
    }

  const handleCrop = async () => {
    const image = coverImage.imageBitmap()
    const frame = imageFrame()

    if (image === null || frame === null || isCropping()) {
      return
    }

    setCropErrorMessage(null)
    setIsCropping(true)
    cropOperationVersion += 1
    const operationVersion = cropOperationVersion

    try {
      const croppedImage = await cropCustomAlbumImage({
        image,
        sourceSize: frame.sourceSize,
        sourceX: frame.sourceX,
        sourceY: frame.sourceY,
      })
      if (operationVersion !== cropOperationVersion) {
        return
      }
      props.onApply(croppedImage)
    } catch (error: unknown) {
      if (operationVersion !== cropOperationVersion) {
        return
      }
      setCropErrorMessage(
        error instanceof CustomAlbumError
          ? getCustomAlbumErrorMessage(error)
          : m.album_custom_error_cover_invalid(),
      )
    } finally {
      if (operationVersion === cropOperationVersion) {
        setIsCropping(false)
      }
    }
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      return
    }
    cropOperationVersion += 1
    setIsCropping(false)
    props.onCancel()
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
    position: crop.position,
    zoom: crop.zoom,
  }
}
