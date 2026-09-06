/** @vitest-environment jsdom */
import {cleanup, render} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiaryTurnSheet} from '../TurnSheet'
import {createEditorProps} from './fixtures/pages'
vi.mock('../Canvas', () => ({PictureDiaryCanvas: vi.fn()}))
vi.mock('../Drawing', () => ({PictureDiaryDrawing: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should render inert preview faces and switch to cover faces for cover turns', () => {
  const editor = createEditorProps()
  const [kind, setKind] = createSignal<'entry' | 'cover'>('entry')
  const view = render(() => (
    <PictureDiaryTurnSheet
      editor={editor}
      front={{kind: 'writing'}}
      back={{kind: 'cover'}}
      turn={{
        compact: false,
        direction: 'older',
        fold: null,
        kind: kind(),
        pageHeight: 500,
        pageWidth: 350,
        phase: 'move',
      }}
    />
  ))
  const sheet = view.container.firstElementChild
  expect(sheet).toHaveAttribute('inert')
  expect(sheet).toHaveAttribute('aria-hidden', 'true')
  expect(view.container.querySelectorAll('[data-picture-diary-turn-face]')).toHaveLength(2)
  expect(view.container.querySelector('textarea')).toBeDisabled()
  setKind('cover')
  expect(sheet).toHaveAttribute('data-picture-diary-cover-turn')
  expect(view.container.querySelectorAll('.picture-diary-book__back-cover')).toHaveLength(2)
})
