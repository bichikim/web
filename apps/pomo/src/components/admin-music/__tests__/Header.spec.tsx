/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {AdminMusicHeader} from '../Header'
import {createModelHarness} from './fixtures/model'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should toggle the draft editor for a loaded catalog', () => {
  const {model} = createModelHarness()
  const [open, setOpen] = createSignal(false)
  const headerModel = {
    ...model,
    albumStats: () => ({draft: 1, published: 1, total: 2}),
    isAlbumEditorOpen: open,
    isLoading: () => false,
    setIsAlbumEditorOpen: setOpen,
  }
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => (
          <>
            <AdminMusicHeader model={headerModel} />
          </>
        )}
      />
    </Router>
  ))
  fireEvent.click(screen.getByRole('button', {name: '+ 새 앨범 만들기'}))
  expect(screen.getByRole('button', {name: '작성 화면 닫기'})).toBeVisible()
  expect(open()).toBe(true)
})
