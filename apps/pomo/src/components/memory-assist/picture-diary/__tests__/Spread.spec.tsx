/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiarySpread} from '../Spread'
import {createEditorProps} from './fixtures/pages'
vi.mock('../Canvas', () => ({PictureDiaryCanvas: vi.fn()}))
vi.mock('../Drawing', () => ({PictureDiaryDrawing: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should replace both pages with a cover when closed and block interaction during turns', () => {
  const editor = createEditorProps()
  const [closed, setClosed] = createSignal(false)
  const [turning, setTurning] = createSignal(false)
  const view = render(() => (
    <PictureDiarySpread
      editor={editor}
      closed={closed()}
      turning={turning()}
      spread={editor.spread}
    />
  ))
  expect(screen.getByRole('textbox')).toBeInTheDocument()
  setClosed(true)
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
  expect(view.container.querySelector('[data-picture-diary-cover=back]')).toBeInTheDocument()
  setTurning(true)
  expect(view.container.firstElementChild).toHaveProperty('inert', true)
})
