/** @vitest-environment jsdom */
import {render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {expect, it} from 'vitest'
import SPreview from '../SPreview'
import type {Preview} from '../use-workspace'

it('should replace the empty state with image dimensions and restore it when cleared', () => {
  const [image, setImage] = createSignal<Preview | null>(null)
  const view = render(() => <SPreview title="원본" image={image()} />)
  expect(view.queryByRole('img')).toBeNull()
  expect(view.getByText('이미지가 여기에 표시됩니다.')).toBeDefined()
  setImage({height: 16, url: 'data:image/png;base64,preview', width: 24})
  expect(view.getByRole('img', {name: '원본'})).toHaveAttribute(
    'src',
    'data:image/png;base64,preview',
  )
  expect(view.getByText('24 × 16')).toBeDefined()
  setImage(null)
  expect(view.queryByRole('img')).toBeNull()
})
