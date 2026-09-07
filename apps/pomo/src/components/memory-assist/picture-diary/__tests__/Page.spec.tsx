/** @vitest-environment jsdom */
import {cleanup, render, screen} from '@solidjs/testing-library'
import {type ComponentProps, createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {PictureDiaryPage} from '../Page'
import {createEditorProps, ENTRY} from './fixtures/pages'
vi.mock('../Canvas', () => ({PictureDiaryCanvas: vi.fn()}))
vi.mock('../Drawing', () => ({PictureDiaryDrawing: vi.fn()}))

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should choose cover, writing, and saved-entry content for the requested page', () => {
  const [page, setPage] = createSignal<ComponentProps<typeof PictureDiaryPage>['page']>({
    kind: 'cover',
  })
  const view = render(() => (
    <PictureDiaryPage editor={createEditorProps()} page={page()} side="previous" />
  ))
  expect(view.container.querySelector('.picture-diary-book__back-cover')).toBeInTheDocument()
  setPage({kind: 'writing'})
  expect(screen.getByRole('textbox')).toBeVisible()
  setPage({entry: ENTRY, kind: 'entry'})
  expect(screen.getByText('산책한 날')).toBeVisible()
  expect(screen.queryByRole('textbox')).not.toBeInTheDocument()
})
