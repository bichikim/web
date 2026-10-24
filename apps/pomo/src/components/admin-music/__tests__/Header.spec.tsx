/** @vitest-environment jsdom */
import {Route, Router} from '@solidjs/router'
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {createSignal} from 'solid-js'
import {afterEach, expect, it, vi} from 'vitest'
import {AdminMusicHeader} from '../Header'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

it('should toggle the draft editor for a loaded catalog', () => {
  const [open, setOpen] = createSignal(false)
  const headerModel = {
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

it('should follow catalog and editor changes from the supplied accessors', () => {
  const [loading, setLoading] = createSignal(true)
  const [stats, setStats] = createSignal({draft: 0, published: 0, total: 0})
  const [open, setOpen] = createSignal(false)
  render(() => (
    <Router>
      <Route
        path="*"
        component={() => (
          <AdminMusicHeader
            model={{
              albumStats: stats,
              isAlbumEditorOpen: open,
              isLoading: loading,
              setIsAlbumEditorOpen: setOpen,
            }}
          />
        )}
      />
    </Router>
  ))

  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  setStats({draft: 2, published: 1, total: 3})
  expect(screen.getAllByRole('definition').map((value) => value.textContent)).toEqual([
    '3',
    '2',
    '1',
  ])
  expect(screen.queryByRole('button')).not.toBeInTheDocument()

  setLoading(false)
  expect(screen.getByRole('button', {name: '+ 새 앨범 만들기'})).toBeVisible()
  setOpen(true)
  expect(screen.getByRole('button', {name: '작성 화면 닫기'})).toBeVisible()
  setStats({draft: 0, published: 0, total: 0})
  expect(screen.queryByRole('button')).not.toBeInTheDocument()
  setStats({draft: 1, published: 0, total: 1})
  expect(screen.getByRole('button', {name: '작성 화면 닫기'})).toBeVisible()
})
