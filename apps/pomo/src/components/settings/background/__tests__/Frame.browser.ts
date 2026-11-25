import {cleanup, render} from '@solidjs/testing-library'
import {createComponent} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {page} from 'vitest/browser'
import * as m from '@paraglide/message'
import {useBackground} from 'src/features/background'
import {getBackgroundRepository} from 'src/features/background/repository'
import {DEFAULT_BACKGROUND} from '@winter-love/wallpaper/model'
import {Frame} from '../Frame'

vi.mock('src/features/background/repository', () => ({getBackgroundRepository: vi.fn()}))
afterEach(cleanup)

const createJpeg = (color: string): Promise<Blob> =>
  new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas')
    const context = canvas.getContext('2d')!
    context.fillStyle = color
    context.fillRect(0, 0, canvas.width, canvas.height)
    canvas.toBlob((blob) => {
      if (blob === null) {
        reject(new Error('Failed to encode JPEG fixture'))
      } else {
        resolve(blob)
      }
    }, 'image/jpeg')
  })

it('should add JPEG files with missing MIME types from drop and file selection', async () => {
  const add = vi.fn()
  vi.mocked(getBackgroundRepository).mockResolvedValue({
    add,
    configure: vi.fn(),
    load: vi.fn(),
    read: async () => ({items: [], preferences: DEFAULT_BACKGROUND}),
    remove: vi.fn(),
    subscribe: () => vi.fn(),
  })
  render(() => createComponent(Frame, {background: useBackground()}))
  const group = page.getByRole('group', {name: m.background_add()})
  const input = group.getByLabelText(m.background_add())
  await expect.element(input).toBeEnabled()
  const dropName = 'without-mime-drop.jpg'
  const selectionName = 'without-mime-selection.JPEG'
  const droppedFile = new File([await createJpeg('#990000')], dropName)
  const dropped = new DataTransfer()
  dropped.items.add(droppedFile)
  const drop = new DragEvent('drop', {bubbles: true})
  Object.defineProperty(drop, 'dataTransfer', {value: dropped})
  expect(drop.dataTransfer?.files[0]?.type).toBe('')
  group.element().dispatchEvent(drop)
  await expect
    .poll(() => add.mock.calls[0])
    .toEqual([expect.objectContaining({name: dropName}), 'photo'])
  await expect.element(input).toBeEnabled()

  const selected = new DataTransfer()
  selected.items.add(new File([await createJpeg('#009900')], selectionName))
  const field = input.element() as HTMLInputElement
  field.files = selected.files
  expect(field.files[0]?.type).toBe('')
  field.dispatchEvent(new Event('change', {bubbles: true}))
  await expect
    .poll(() => add.mock.calls[1])
    .toEqual([expect.objectContaining({name: selectionName}), 'photo'])
})
