import '@unocss/reset/tailwind.css'
import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {commands, page, userEvent} from 'vitest/browser'
import * as m from '@paraglide/message'
import {CustomAlbumCoverCropModal} from '../CustomAlbumCoverCropModal'

declare module 'vitest/browser' {
  interface BrowserCommands {
    getUtilityStyles: (content: string) => Promise<string>
  }
}

const IMAGE_EDGE = 1024
const VIEWPORT_EDGE = 512
const RGBA_CHANNELS = 4
const ALPHA_CHANNEL = 3
const COLOR_DIVISOR = 4
const PIXEL_TOLERANCE = 5
const DRAG_DISTANCE = 15

const nativeToBlob = HTMLCanvasElement.prototype.toBlob
let stylesheet: HTMLStyleElement | null = null

const createImageFile = async (type: 'image/png' | 'image/jpeg') => {
  const canvas = document.createElement('canvas')
  canvas.width = IMAGE_EDGE
  canvas.height = IMAGE_EDGE
  const context = canvas.getContext('2d')!
  const pixels = context.createImageData(IMAGE_EDGE, IMAGE_EDGE)
  for (let index = 0; index < pixels.data.length; index += RGBA_CHANNELS) {
    const pixel = index / RGBA_CHANNELS
    pixels.data[index] = (pixel % IMAGE_EDGE) / COLOR_DIVISOR
    pixels.data[index + 1] = Math.floor(pixel / IMAGE_EDGE) / COLOR_DIVISOR
    pixels.data[index + 2] = 80
    pixels.data[index + ALPHA_CHANNEL] = 255
  }
  context.putImageData(pixels, 0, 0)
  const blob = await new Promise<Blob>((resolve) => {
    nativeToBlob.call(canvas, (value) => resolve(value!), type)
  })
  return new File([blob], type === 'image/png' ? 'cover.png' : 'cover.jpg', {type})
}

const holdEncoding = () => {
  const pending: Array<{blob: Blob | null; complete: BlobCallback}> = []
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation(
    function encode(this: HTMLCanvasElement, complete, type, quality) {
      nativeToBlob.call(this, (blob) => pending.push({blob, complete}), type, quality)
    },
  )
  return pending
}

const mount = async (type: 'image/png' | 'image/jpeg' = 'image/png') => {
  const file = await createImageFile(type)
  const onApply = vi.fn<(cover: Blob) => void>()
  const onCancel = vi.fn()
  render(() => createComponent(CustomAlbumCoverCropModal, {file, isOpen: true, onApply, onCancel}))
  const selection = page.getByRole('group', {name: m.album_custom_cover_crop_move_selection()})
  await expect.element(selection).toBeVisible()
  stylesheet = document.createElement('style')
  stylesheet.textContent = await commands.getUtilityStyles(document.body.outerHTML)
  document.head.append(stylesheet)
  await page.getByRole('slider', {name: m.album_custom_cover_zoom({percent: 100})}).click()
  const zoom = document.getElementById('custom-cover-zoom') as HTMLInputElement
  // Use the native keyboard path to set an exact 200% zoom from its minimum.
  await userEvent.keyboard('{Home}{ArrowRight>100/}')
  expect(zoom.value).toBe('200')
  return {onApply, onCancel, selection}
}

const snapshot = () => {
  const preview = page.getByRole('img', {name: m.album_custom_cover_crop_preview()}).element()
  return preview.getAttribute('viewBox')
}

afterEach(() => {
  cleanup()
  stylesheet?.remove()
  stylesheet = null
  vi.restoreAllMocks()
})

it.each(['image/png', 'image/jpeg'] as const)(
  'should freeze the displayed %s crop while encoding after a normal apply click',
  async (type) => {
    const {selection, onApply, onCancel} = await mount(type)
    // An ordinary focused selection moves before apply.
    await selection.click()
    await userEvent.keyboard('{ArrowRight}')
    const applied = snapshot()
    const pending = holdEncoding()
    await page.getByRole('button', {name: m.album_custom_cover_crop_apply()}).click()
    await expect.poll(() => pending.length).toBe(1)
    await expect
      .element(page.getByRole('button', {name: m.album_custom_cover_cropping()}))
      .toBeDisabled()
    await expect.element(page.getByRole('button', {name: m.album_custom_cancel()})).toBeDisabled()
    await userEvent.keyboard('{Tab}')
    expect(document.activeElement).toBe(selection.element())
    await userEvent.keyboard('{ArrowRight>10/}{ArrowDown>10/}{Escape}')
    expect(onCancel).not.toHaveBeenCalled()
    const displayed = snapshot()
    pending[0].complete(pending[0].blob)
    await expect.poll(() => onApply.mock.calls.length).toBe(1)
    const bitmap = await createImageBitmap(onApply.mock.calls[0][0])
    const canvas = document.createElement('canvas')
    canvas.width = VIEWPORT_EDGE
    canvas.height = VIEWPORT_EDGE
    const context = canvas.getContext('2d')!
    context.drawImage(bitmap, 0, 0)
    bitmap.close()
    const pixel = [...context.getImageData(0, 0, 1, 1).data]
    console.log('CROP_ENCODING_SNAPSHOT', JSON.stringify({applied, displayed, pixel, type}))
    const [x, y] = applied!.split(' ').map(Number)
    const coordinateColor = IMAGE_EDGE / VIEWPORT_EDGE / COLOR_DIVISOR
    expect(Math.abs(pixel[0] - x * coordinateColor)).toBeLessThan(PIXEL_TOLERANCE)
    expect(Math.abs(pixel[1] - y * coordinateColor)).toBeLessThan(PIXEL_TOLERANCE)
    expect(displayed).toBe(applied)
    // A consumer that keeps the modal open can edit again after success.
    await userEvent.keyboard('{ArrowRight}')
    expect(snapshot()).not.toBe(applied)
  },
)

it('should freeze resize keys until a failed encoder allows editing and retry', async () => {
  const {selection, onApply, onCancel} = await mount()
  await selection.click()
  await userEvent.keyboard('{Tab}{ArrowLeft}')
  const applied = snapshot()
  expect(applied).not.toBe('128 128 256 256')
  const pending = holdEncoding()
  await page.getByRole('button', {name: m.album_custom_cover_crop_apply()}).click()
  await expect.poll(() => pending.length).toBe(1)
  await userEvent.keyboard('{Tab}{Tab}{ArrowLeft}')
  expect(snapshot()).toBe(applied)
  pending[0].complete(null)
  await expect
    .element(page.getByRole('button', {name: m.album_custom_cover_crop_apply()}))
    .toBeEnabled()
  expect(onApply).not.toHaveBeenCalled()
  expect(onCancel).not.toHaveBeenCalled()
  await selection.click()
  await userEvent.keyboard('{ArrowRight}')
  const moved = snapshot()
  expect(moved).not.toBe(applied)
  await page.getByRole('button', {name: m.album_custom_cover_crop_apply()}).click()
  await expect.poll(() => pending.length).toBe(2)
  pending[1].complete(pending[1].blob)
  await expect.poll(() => onApply.mock.calls.length).toBe(1)
  expect(snapshot()).toBe(moved)
})

it.each(['move', 'southeast'] as const)(
  'should block a new native %s drag while applying and restore it after success',
  async (handle) => {
    const {onApply} = await mount()
    const canvas = page.getByRole('group', {name: m.album_custom_cover_crop_canvas()})
    const drag = async () => {
      const [x, y, size] = snapshot()!.split(' ').map(Number)
      const bounds = canvas.element().getBoundingClientRect()
      const factor = handle === 'move' ? 1 / 2 : 1
      const source = {
        x: ((x + size * factor) / VIEWPORT_EDGE) * bounds.width,
        y: ((y + size * factor) / VIEWPORT_EDGE) * bounds.height,
      }
      await userEvent.dragAndDrop(canvas, canvas, {
        sourcePosition: source,
        targetPosition: {x: source.x + DRAG_DISTANCE, y: source.y + DRAG_DISTANCE},
      })
    }
    const initial = snapshot()
    await drag()
    const applied = snapshot()
    expect(applied).not.toBe(initial)
    const pending = holdEncoding()
    await page.getByRole('button', {name: m.album_custom_cover_crop_apply()}).click()
    await expect.poll(() => pending.length).toBe(1)
    await drag()
    expect(snapshot()).toBe(applied)
    await expect.element(canvas).toHaveAttribute('aria-disabled', 'true')
    pending[0].complete(pending[0].blob)
    await expect.poll(() => onApply.mock.calls.length).toBe(1)
    await expect.element(canvas).toHaveAttribute('aria-disabled', 'false')
    await drag()
    expect(snapshot()).not.toBe(applied)
  },
)
