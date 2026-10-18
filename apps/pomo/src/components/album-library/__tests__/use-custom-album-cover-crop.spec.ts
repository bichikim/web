/** @vitest-environment jsdom */

import {createRoot, createSignal} from 'solid-js'
import {afterEach, beforeEach, describe, expect, it, vi} from 'vitest'

import * as m from '@paraglide/message'
import {
  cropCustomAlbumImage,
  CUSTOM_ALBUM_COVER_EDGE,
  CustomAlbumError,
} from 'src/features/custom-albums'
import type {SquareCropResizeHandle} from 'src/hooks/use-square-crop'
import {getCustomAlbumErrorMessage} from '../custom-album-error-message'
import {
  type CustomAlbumCoverCropController,
  useCustomAlbumCoverCrop,
} from '../use-custom-album-cover-crop'
import {useCustomAlbumCoverImage} from '../use-custom-album-cover-image'

vi.mock('src/features/custom-albums', async () => {
  const model = await vi.importActual<typeof import('src/features/custom-albums/model')>(
    'src/features/custom-albums/model',
  )
  return {...model, cropCustomAlbumImage: vi.fn()}
})
vi.mock('../use-custom-album-cover-image', () => ({useCustomAlbumCoverImage: vi.fn()}))
vi.mock('../custom-album-error-message', () => ({getCustomAlbumErrorMessage: vi.fn()}))
vi.mock('@paraglide/message', () => ({album_custom_error_cover_invalid: vi.fn()}))

const disposers: Array<() => void> = []

const createBitmap = (width = 1024, height = 1024): ImageBitmap => ({close: vi.fn(), height, width})

const createHarness = (initialImage: ImageBitmap | null = createBitmap()) =>
  createRoot((dispose) => {
    disposers.push(dispose)
    const [file, setFile] = createSignal(new File(['cover'], 'cover.png', {type: 'image/png'}))
    const [isOpen, setIsOpen] = createSignal(true)
    const [imageBitmap, setImageBitmap] = createSignal(initialImage)
    const [previewUrl, setPreviewUrl] = createSignal<string | null>('blob:album-cover')
    const [isLoading, setIsLoading] = createSignal(initialImage === null)
    const [errorMessage, setErrorMessage] = createSignal<string | null>(null)
    vi.mocked(useCustomAlbumCoverImage).mockReturnValue({
      errorMessage,
      imageBitmap,
      isLoading,
      previewUrl,
    })
    const onApply = vi.fn()
    const onCancel = vi.fn()
    const crop = useCustomAlbumCoverCrop({
      get file() {
        return file()
      },
      get isOpen() {
        return isOpen()
      },
      onApply,
      onCancel,
    })
    return {
      crop,
      dispose,
      file,
      onApply,
      onCancel,
      setErrorMessage,
      setFile,
      setImageBitmap,
      setIsLoading,
      setIsOpen,
      setPreviewUrl,
    }
  })

const createInput = (
  value: number,
): Parameters<CustomAlbumCoverCropController['handleZoomInput']>[0] =>
  ({
    currentTarget: {valueAsNumber: value},
  }) as Parameters<CustomAlbumCoverCropController['handleZoomInput']>[0]

interface PointerOptions {
  readonly button?: number
  readonly clientX?: number
  readonly clientY?: number
  readonly pointerId?: number
  readonly target?: EventTarget | null
}

interface ResizeCase {
  readonly anchorX: number
  readonly anchorY: number
  readonly handle: SquareCropResizeHandle
  readonly key: string
}

const createSurface = (handle = 'move') => {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  const group = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  const target = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
  group.setAttribute('data-crop-handle', handle)
  group.append(target)
  svg.append(group)
  svg.setPointerCapture = vi.fn()
  vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue(new DOMRect(100, 40, 256, 128))
  const pointer = (
    options: PointerOptions = {},
  ): Parameters<CustomAlbumCoverCropController['handlePointerDown']>[0] =>
    ({
      button: 0,
      clientX: 228,
      clientY: 104,
      currentTarget: svg,
      pointerId: 7,
      target,
      ...options,
    }) as Parameters<CustomAlbumCoverCropController['handlePointerDown']>[0]
  return {pointer, svg}
}

const createKey = (key: string): KeyboardEvent =>
  new KeyboardEvent('keydown', {cancelable: true, key})

beforeEach(() => {
  vi.mocked(m.album_custom_error_cover_invalid).mockReturnValue(
    'Invalid cover image' as ReturnType<typeof m.album_custom_error_cover_invalid>,
  )
  vi.mocked(getCustomAlbumErrorMessage).mockReturnValue('Cover image is too large')
})

afterEach(() => {
  for (const dispose of disposers.splice(0)) {
    dispose()
  }
  vi.resetAllMocks()
  vi.restoreAllMocks()
})

describe('image state and modal lifecycle', () => {
  it('should forward reactive file and open values to the image owner', () => {
    const harness = createHarness()
    const imageProps = vi.mocked(useCustomAlbumCoverImage).mock.calls[0]?.[0]
    expect(imageProps?.file).toBe(harness.file())
    expect(imageProps?.isOpen).toBe(true)

    const replacement = new File(['replacement'], 'next.png')
    harness.setFile(replacement)
    harness.setIsOpen(false)
    expect(imageProps?.file).toBe(replacement)
    expect(imageProps?.isOpen).toBe(false)
  })

  it('should expose loading and image errors and require both image and preview for a frame', async () => {
    const harness = createHarness(null)
    expect(harness.crop.isLoading()).toBe(true)
    expect(harness.crop.imageFrame()).toBeNull()
    await harness.crop.handleCrop()
    expect(cropCustomAlbumImage).not.toHaveBeenCalled()

    harness.setIsLoading(false)
    harness.setErrorMessage('Decode failed')
    expect(harness.crop.isLoading()).toBe(false)
    expect(harness.crop.errorMessage()).toBe('Decode failed')
    harness.setImageBitmap(createBitmap())
    expect(harness.crop.imageFrame()).toMatchObject({
      imageHeight: CUSTOM_ALBUM_COVER_EDGE,
      imageWidth: CUSTOM_ALBUM_COVER_EDGE,
      source: 'blob:album-cover',
    })
    harness.setPreviewUrl(null)
    expect(harness.crop.imageFrame()).toBeNull()
    await harness.crop.handleCrop()
    expect(cropCustomAlbumImage).not.toHaveBeenCalled()
  })

  it('should preserve adjustments when the image loads and reset only when reopening', () => {
    const harness = createHarness(null)
    harness.crop.handleZoomInput(createInput(200))
    harness.crop.handleHorizontalPositionInput(createInput(75))
    harness.setImageBitmap(createBitmap())
    expect(harness.crop.zoom()).toBe(2)
    expect(harness.crop.position()).toEqual({x: 0.5, y: 0})

    harness.setImageBitmap(createBitmap(2048, 1024))
    harness.setPreviewUrl('blob:replacement')
    expect(harness.crop.zoom()).toBe(2)
    expect(harness.crop.position()).toEqual({x: 0.5, y: 0})
    expect(harness.crop.imageFrame()?.source).toBe('blob:replacement')

    harness.setIsOpen(false)
    expect(harness.crop.zoom()).toBe(2)
    harness.setIsOpen(true)
    expect(harness.crop.zoom()).toBe(1)
    expect(harness.crop.position()).toEqual({x: 0, y: 0})
  })

  it('should end an active gesture when closing or replacing the image without closing borrowed images', () => {
    const image = createBitmap()
    const harness = createHarness(image)
    const {pointer} = createSurface()
    harness.crop.handleZoomInput(createInput(200))
    harness.crop.handlePointerDown(pointer())
    harness.setIsOpen(false)
    harness.crop.handlePointerMove(pointer({clientX: 250}))
    expect(harness.crop.position()).toEqual({x: 0, y: 0})

    harness.setIsOpen(true)
    harness.crop.handleZoomInput(createInput(200))
    harness.crop.handlePointerDown(pointer())
    const replacement = createBitmap()
    harness.setImageBitmap(replacement)
    harness.crop.handlePointerMove(pointer({clientX: 250}))
    expect(harness.crop.position()).toEqual({x: 0, y: 0})
    harness.dispose()
    expect(image.close).not.toHaveBeenCalled()
    expect(replacement.close).not.toHaveBeenCalled()
  })

  it('should request cancellation only for a closed modal', () => {
    const {crop, onCancel} = createHarness()
    crop.handleOpenChange(true)
    expect(onCancel).not.toHaveBeenCalled()
    crop.handleOpenChange(false)
    expect(onCancel).toHaveBeenCalledOnce()
  })
})

describe('percentage controls', () => {
  it.each([
    {percent: 0, zoom: 1},
    {percent: 100, zoom: 1},
    {percent: 175, zoom: 1.75},
    {percent: 300, zoom: 3},
    {percent: 400, zoom: 3},
  ])('should map $percent percent to bounded zoom $zoom', ({percent, zoom}) => {
    const {crop} = createHarness()
    crop.handleZoomInput(createInput(percent))
    expect(crop.zoom()).toBe(zoom)
    expect(crop.imageFrame()?.sourceSize).toBeCloseTo(1024 / zoom)
  })

  it('should map position percentages to normalized coordinates while preserving the other axis', () => {
    const {crop} = createHarness()
    crop.handleZoomInput(createInput(200))
    crop.handleHorizontalPositionInput(createInput(0))
    crop.handleVerticalPositionInput(createInput(100))
    expect(crop.position()).toEqual({x: -1, y: 1})
    crop.handleHorizontalPositionInput(createInput(75))
    expect(crop.position()).toEqual({x: 0.5, y: 1})
    crop.handleVerticalPositionInput(createInput(50))
    expect(crop.position()).toEqual({x: 0.5, y: 0})
  })
})

describe('pointer adaptation', () => {
  it('should convert client coordinates relative to the SVG rectangle into its 512-unit viewbox', () => {
    const {crop} = createHarness()
    const {pointer, svg} = createSurface()
    crop.handleZoomInput(createInput(200))
    crop.handlePointerDown(pointer())
    expect(svg.setPointerCapture).toHaveBeenCalledExactlyOnceWith(7)
    crop.handlePointerMove(pointer({clientX: 260, clientY: 112}))
    expect(crop.imageFrame()).toMatchObject({cropSize: 256, cropX: 192, cropY: 160})
    expect(crop.position()).toEqual({x: 0.5, y: 0.25})
  })

  it('should ignore other pointers without ending or replacing the captured gesture', () => {
    const {crop} = createHarness()
    const {pointer, svg} = createSurface()
    crop.handleZoomInput(createInput(200))
    crop.handlePointerDown(pointer())
    crop.handlePointerDown(pointer({pointerId: 8}))
    crop.handlePointerMove(pointer({clientX: 260, pointerId: 8}))
    crop.handlePointerEnd(pointer({pointerId: 8}))
    expect(crop.position()).toEqual({x: 0, y: 0})
    expect(svg.setPointerCapture).toHaveBeenCalledOnce()
    crop.handlePointerMove(pointer({clientX: 260}))
    expect(crop.position()).toEqual({x: 0.5, y: 0})
    crop.handlePointerEnd(pointer())
    crop.handlePointerMove(pointer({clientX: 292}))
    expect(crop.position()).toEqual({x: 0.5, y: 0})
  })

  it('should reject non-primary buttons and targets without a recognized handle', () => {
    const {crop} = createHarness()
    const {pointer, svg} = createSurface('unrecognized')
    crop.handleZoomInput(createInput(200))
    crop.handlePointerDown(pointer())
    crop.handlePointerDown(pointer({target: null}))
    crop.handlePointerDown(pointer({target: document.createTextNode('label')}))
    crop.handlePointerDown(pointer({target: svg}))
    const move = createSurface()
    crop.handlePointerDown(move.pointer({button: 2}))
    crop.handlePointerMove(move.pointer({clientX: 260}))
    expect(svg.setPointerCapture).not.toHaveBeenCalled()
    expect(move.svg.setPointerCapture).not.toHaveBeenCalled()
    expect(crop.position()).toEqual({x: 0, y: 0})
  })

  it('should ignore pointer input when the SVG has no size or no image preview', () => {
    const harness = createHarness()
    const {pointer, svg} = createSurface()
    vi.mocked(svg.getBoundingClientRect).mockReturnValue(new DOMRect(0, 0, 0, 128))
    harness.crop.handlePointerDown(pointer())
    harness.crop.handlePointerMove(pointer({clientX: 260}))
    expect(svg.setPointerCapture).not.toHaveBeenCalled()
    vi.mocked(svg.getBoundingClientRect).mockReturnValue(new DOMRect(100, 40, 256, 128))
    harness.setPreviewUrl(null)
    harness.crop.handlePointerDown(pointer())
    expect(svg.setPointerCapture).not.toHaveBeenCalled()
  })

  it('should resolve a resize handle through its child and preserve its opposite corner', () => {
    const {crop} = createHarness()
    const {pointer} = createSurface('southeast')
    crop.handleZoomInput(createInput(200))
    crop.handlePointerDown(pointer({clientX: 292, clientY: 136}))
    crop.handlePointerMove(pointer({clientX: 308, clientY: 144}))
    expect(crop.imageFrame()).toMatchObject({cropSize: 288, cropX: 128, cropY: 128})
    crop.handlePointerEnd()
    crop.handlePointerMove(pointer({clientX: 324, clientY: 152}))
    expect(crop.imageFrame()?.cropSize).toBe(288)
  })
})

describe('keyboard adaptation', () => {
  it('should prevent default for arrow movement only when a frame is available', () => {
    const harness = createHarness()
    harness.crop.handleZoomInput(createInput(200))
    const arrow = createKey('ArrowRight')
    harness.crop.handleSelectionKeyDown(
      arrow as Parameters<CustomAlbumCoverCropController['handleSelectionKeyDown']>[0],
    )
    expect(arrow.defaultPrevented).toBe(true)
    expect(harness.crop.imageFrame()?.cropX).toBe(133)
    const other = createKey('Enter')
    harness.crop.handleSelectionKeyDown(
      other as Parameters<CustomAlbumCoverCropController['handleSelectionKeyDown']>[0],
    )
    expect(other.defaultPrevented).toBe(false)
    harness.setImageBitmap(null)
    const unavailable = createKey('ArrowDown')
    harness.crop.handleSelectionKeyDown(
      unavailable as Parameters<CustomAlbumCoverCropController['handleSelectionKeyDown']>[0],
    )
    expect(unavailable.defaultPrevented).toBe(false)
  })

  it.each<ResizeCase>([
    {anchorX: 1, anchorY: 1, handle: 'northwest', key: 'ArrowLeft'},
    {anchorX: 0.5, anchorY: 1, handle: 'north', key: 'ArrowUp'},
    {anchorX: 0, anchorY: 1, handle: 'northeast', key: 'ArrowRight'},
    {anchorX: 0, anchorY: 0.5, handle: 'east', key: 'ArrowRight'},
    {anchorX: 0, anchorY: 0, handle: 'southeast', key: 'ArrowDown'},
    {anchorX: 0.5, anchorY: 0, handle: 'south', key: 'ArrowDown'},
    {anchorX: 1, anchorY: 0, handle: 'southwest', key: 'ArrowLeft'},
    {anchorX: 1, anchorY: 0.5, handle: 'west', key: 'ArrowLeft'},
  ])(
    'should keep the opposite anchor for the $handle keyboard resize handle',
    ({handle, key, anchorX, anchorY}) => {
      const {crop} = createHarness()
      crop.handleZoomInput(createInput(200))
      const event = createKey(key)
      crop.handleResizeKeyDown(handle)(
        event as Parameters<ReturnType<CustomAlbumCoverCropController['handleResizeKeyDown']>>[0],
      )
      const frame = crop.imageFrame()
      expect(frame?.cropSize).toBe(261)
      expect((frame?.cropX ?? 0) + (frame?.cropSize ?? 0) * anchorX).toBeCloseTo(
        128 + 256 * anchorX,
      )
      expect((frame?.cropY ?? 0) + (frame?.cropSize ?? 0) * anchorY).toBeCloseTo(
        128 + 256 * anchorY,
      )
      expect(event.defaultPrevented).toBe(true)
      const ignored = createKey('Tab')
      crop.handleResizeKeyDown(handle)(
        ignored as Parameters<ReturnType<CustomAlbumCoverCropController['handleResizeKeyDown']>>[0],
      )
      expect(ignored.defaultPrevented).toBe(false)
    },
  )
})

describe('crop encoding', () => {
  it('should encode original image coordinates, block concurrent applies, and allow a later apply', async () => {
    const image = createBitmap(2048, 1024)
    const {crop, onApply} = createHarness(image)
    crop.handleZoomInput(createInput(200))
    crop.handleHorizontalPositionInput(createInput(100))
    crop.handleVerticalPositionInput(createInput(0))
    const pending = Promise.withResolvers<Blob>()
    vi.mocked(cropCustomAlbumImage).mockReturnValue(pending.promise)
    const applying = crop.handleCrop()
    expect(crop.isCropping()).toBe(true)
    expect(cropCustomAlbumImage).toHaveBeenCalledExactlyOnceWith({
      image,
      sourceSize: 512,
      sourceX: 1536,
      sourceY: 0,
    })
    await crop.handleCrop()
    expect(cropCustomAlbumImage).toHaveBeenCalledOnce()
    expect(onApply).not.toHaveBeenCalled()
    const cover = new Blob(['encoded'], {type: 'image/webp'})
    pending.resolve(cover)
    await applying
    expect(crop.isCropping()).toBe(false)
    expect(onApply).toHaveBeenCalledExactlyOnceWith(cover)
    await crop.handleCrop()
    expect(cropCustomAlbumImage).toHaveBeenCalledTimes(2)
    expect(onApply).toHaveBeenCalledTimes(2)
    expect(image.close).not.toHaveBeenCalled()
  })

  it('should invalidate a pending crop when cancellation is requested', async () => {
    const harness = createHarness()
    const pending = Promise.withResolvers<Blob>()
    vi.mocked(cropCustomAlbumImage).mockReturnValueOnce(pending.promise)
    const applying = harness.crop.handleCrop()

    harness.crop.handleOpenChange(false)
    pending.resolve(new Blob(['cancelled']))
    await applying

    expect(harness.onCancel).toHaveBeenCalledOnce()
    expect(harness.crop.isCropping()).toBe(false)
    expect(harness.onApply).not.toHaveBeenCalled()
  })

  it.each(['resolve', 'reject'] as const)(
    'should ignore a late %s after the crop owner is disposed',
    async (settlement) => {
      const harness = createHarness()
      const pending = Promise.withResolvers<Blob>()
      vi.mocked(cropCustomAlbumImage).mockReturnValueOnce(pending.promise)
      const applying = harness.crop.handleCrop()

      harness.dispose()
      if (settlement === 'resolve') {
        pending.resolve(new Blob(['stale']))
      } else {
        pending.reject(new Error('stale encoding failure'))
      }
      await applying

      expect(harness.crop.errorMessage()).toBeNull()
      expect(getCustomAlbumErrorMessage).not.toHaveBeenCalled()
      expect(m.album_custom_error_cover_invalid).not.toHaveBeenCalled()
      expect(harness.onApply).not.toHaveBeenCalled()
    },
  )

  it.each(['resolve', 'reject'] as const)(
    'should ignore a late %s for a replaced file and allow a new crop in the same owner',
    async (settlement) => {
      const harness = createHarness()
      const stale = Promise.withResolvers<Blob>()
      const current = Promise.withResolvers<Blob>()
      vi.mocked(cropCustomAlbumImage)
        .mockReturnValueOnce(stale.promise)
        .mockReturnValueOnce(current.promise)
      const applyingStale = harness.crop.handleCrop()

      harness.setFile(new File(['replacement'], 'replacement.png', {type: 'image/png'}))
      expect(harness.crop.isCropping()).toBe(false)
      if (settlement === 'resolve') {
        stale.resolve(new Blob(['stale']))
      } else {
        stale.reject(new Error('stale encoding failure'))
      }
      await applyingStale

      expect(harness.crop.errorMessage()).toBeNull()
      expect(getCustomAlbumErrorMessage).not.toHaveBeenCalled()
      expect(m.album_custom_error_cover_invalid).not.toHaveBeenCalled()
      expect(harness.onApply).not.toHaveBeenCalled()

      const applyingCurrent = harness.crop.handleCrop()
      const cover = new Blob(['current'], {type: 'image/webp'})
      current.resolve(cover)
      await applyingCurrent

      expect(harness.crop.isCropping()).toBe(false)
      expect(harness.onApply).toHaveBeenCalledExactlyOnceWith(cover)
    },
  )

  it('should localize domain errors and clear the crop error on a subsequent attempt', async () => {
    const harness = createHarness()
    harness.setErrorMessage('Earlier image error')
    const error = new CustomAlbumError('cover-too-large')
    vi.mocked(cropCustomAlbumImage).mockRejectedValueOnce(error)
    await harness.crop.handleCrop()
    expect(getCustomAlbumErrorMessage).toHaveBeenCalledExactlyOnceWith(error)
    expect(harness.crop.errorMessage()).toBe('Cover image is too large')
    expect(harness.crop.isCropping()).toBe(false)
    expect(harness.onApply).not.toHaveBeenCalled()

    harness.setErrorMessage(null)
    const pending = Promise.withResolvers<Blob>()
    vi.mocked(cropCustomAlbumImage).mockReturnValueOnce(pending.promise)
    const applying = harness.crop.handleCrop()
    expect(harness.crop.errorMessage()).toBeNull()
    expect(harness.crop.isCropping()).toBe(true)
    pending.resolve(new Blob(['encoded']))
    await applying
    expect(harness.crop.isCropping()).toBe(false)
    expect(harness.onApply).toHaveBeenCalledOnce()
  })

  it('should report unexpected encoding failures with the invalid-cover message', async () => {
    const {crop, onApply} = createHarness()
    vi.mocked(cropCustomAlbumImage).mockRejectedValueOnce(new Error('Canvas unavailable'))
    await crop.handleCrop()
    expect(crop.errorMessage()).toBe('Invalid cover image')
    expect(crop.isCropping()).toBe(false)
    expect(getCustomAlbumErrorMessage).not.toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
  })
})
