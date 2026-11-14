/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import * as m from '@paraglide/message'
import {memoizeAsync} from 'src/utils/memoize-async'
import {CustomAlbumCoverCropCanvas} from '../CustomAlbumCoverCropCanvas'
import {createCropController, CROP_FRAME} from './fixtures/cover-crop'

vi.mock('src/utils/memoize-async', () => ({memoizeAsync: vi.fn()}))

// Preserve cold calls before per-test mock cleanup.
const initializersDuringImport = vi.mocked(memoizeAsync).mock.calls.length

afterEach(() => {
  cleanup()
  vi.clearAllMocks()
})

it('should retain reactive SVG geometry without initializing database memoizers', () => {
  const [frame, setFrame] = createSignal(CROP_FRAME)
  const [cropping, setCropping] = createSignal(false)
  const crop = createCropController(frame, cropping)
  render(() => <CustomAlbumCoverCropCanvas crop={crop} frame={frame()} />)
  const canvas = screen.getByRole('group', {name: m.album_custom_cover_crop_canvas()})
  const selection = screen.getByRole('group', {name: m.album_custom_cover_crop_move_selection()})
  const preview = screen.getByRole('img', {name: m.album_custom_cover_crop_preview()})
  expect(canvas).toHaveAttribute('viewBox', '0 0 512 512')
  expect(selection).toHaveAttribute('x', '128')
  expect(selection).toHaveAttribute('width', '256')
  expect(preview).toHaveAttribute('viewBox', '128 128 256 256')

  setFrame({...CROP_FRAME, cropSize: 128, cropX: 64, cropY: 96})
  expect(screen.getByRole('group', {name: m.album_custom_cover_crop_move_selection()})).toBe(
    selection,
  )
  expect(selection).toHaveAttribute('x', '64')
  expect(selection).toHaveAttribute('y', '96')
  expect(selection).toHaveAttribute('width', '128')
  expect(preview).toHaveAttribute('viewBox', '64 96 128 128')
  setCropping(true)
  expect(canvas).toHaveAttribute('aria-disabled', 'true')

  expect(initializersDuringImport).toBe(0)
  expect(memoizeAsync).not.toHaveBeenCalled()
})
