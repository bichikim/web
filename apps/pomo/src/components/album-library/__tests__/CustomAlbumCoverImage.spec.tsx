/** @vitest-environment jsdom */

import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {CustomAlbumCoverImage} from '../CustomAlbumCoverImage'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should render cover metadata and replace only its owned image URL', () => {
  const first = new Blob(['first'])
  const next = new Blob(['next'])
  const [cover, setCover] = createSignal(first)
  const [label, setLabel] = createSignal('First album')
  const createUrl = vi
    .spyOn(URL, 'createObjectURL')
    .mockReturnValueOnce('blob:first')
    .mockReturnValueOnce('blob:next')
  const revokeUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)
  const view = render(() => (
    <CustomAlbumCoverImage alt={label()} class="cover-art" coverImage={cover()} />
  ))

  expect(screen.getByRole('img', {name: 'First album'})).toHaveAttribute('src', 'blob:first')
  expect(screen.getByRole('img', {name: 'First album'})).toHaveClass('cover-art')
  setLabel('Renamed album')
  expect(screen.getByRole('img', {name: 'Renamed album'})).toHaveAttribute('src', 'blob:first')
  expect(createUrl).toHaveBeenCalledOnce()
  expect(revokeUrl).not.toHaveBeenCalled()

  setCover(next)
  expect(screen.getByRole('img', {name: 'Renamed album'})).toHaveAttribute('src', 'blob:next')
  expect(createUrl.mock.calls).toEqual([[first], [next]])
  expect(revokeUrl).toHaveBeenCalledExactlyOnceWith('blob:first')
  view.unmount()
  expect(revokeUrl.mock.calls).toEqual([['blob:first'], ['blob:next']])
})
