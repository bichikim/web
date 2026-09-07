/** @vitest-environment jsdom */

import {fireEvent, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../../features/picture-diary'
import {finishPageTurn, renderEditor, sampleEntry, turns} from './fixtures/editor'

it('should show the receiving visible page on the reverse of a compact newer turn', () => {
  turns.setCompact(true)
  renderEditor({
    canGoNewer: true,
    currentEntry: sampleEntry('현재'),
    newerEntry: sampleEntry('다음'),
  })
  const book = screen.getByLabelText('일기장')
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  expect(book.querySelector('[data-picture-diary-turn-face="back"]')).toHaveTextContent('다음')
})

it('should keep the receiving cover underneath the moving page until the turn settles', () => {
  renderEditor({
    canGoNewer: true,
    currentEntry: sampleEntry('oldest'),
    newerEntry: sampleEntry('newer'),
  })
  const book = screen.getByLabelText('일기장')
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  const spread = book.querySelector('.picture-diary-book__spread')!
  expect(spread.querySelector('.picture-diary-book__back-cover--inside')).toBeInTheDocument()
  expect(spread.querySelector('[data-picture-diary-page="previous"]')).toBeNull()
  expect(spread).toHaveTextContent('newer')
  expect(book.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent('oldest')
  turns.advance(300)
  expect(spread.querySelector('.picture-diary-book__back-cover--inside')).toBeInTheDocument()
})

it('should keep the right page unchanged underneath an older turn', () => {
  renderEditor({
    canGoOlder: true,
    currentEntry: sampleEntry('current'),
    olderEntry: sampleEntry('older'),
    previousEntry: sampleEntry('previous'),
  })
  const book = screen.getByLabelText('일기장')
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  const spread = book.querySelector('.picture-diary-book__spread')!
  expect(spread.querySelector('[data-picture-diary-page="current"]')).toHaveTextContent('current')
  expect(spread.querySelector('[data-picture-diary-page="previous"]')).toHaveTextContent('older')
})

it('should turn the visible outgoing page on a compact older turn', () => {
  turns.setCompact(true)
  renderEditor({
    canGoOlder: true,
    currentEntry: sampleEntry('visible'),
    previousEntry: sampleEntry('incoming'),
  })
  const book = screen.getByLabelText('일기장')
  fireEvent.click(screen.getByRole('button', {name: '이전 일기 보기'}))
  expect(book.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent('visible')
  expect(
    book.querySelector('.picture-diary-book__spread [data-picture-diary-page="current"]'),
  ).toHaveTextContent('incoming')
})

it('should show the previous complete entry and animate turns through diary entries', () => {
  const onGoNewer = vi.fn()
  const onGoOlder = vi.fn()
  const currentEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'current-entry',
    strokes: [],
    text: '오늘은 자전거를 탔다.',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const previousEntry = {
    createdAt: '2026-09-03T03:00:00.000Z',
    date: '2026-09-03',
    id: 'previous-entry',
    strokes: [{points: [{x: 0.25, y: 0.5}]}],
    text: '어제는 산책했다.',
    updatedAt: '2026-09-03T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  renderEditor({
    canGoNewer: true,
    canGoOlder: true,
    currentEntry,
    onGoNewer,
    onGoOlder,
    previousEntry,
  })

  const previousPage = screen
    .getByText('어제는 산책했다.')
    .closest('[data-picture-diary-page="previous"]')
  expect(previousPage).toHaveTextContent('2026. 09. 03.')
  expect(screen.getAllByLabelText('저장된 일기의 그림')).toHaveLength(2)

  const book = screen.getByLabelText('일기장')
  const olderButton = screen.getByRole('button', {name: '이전 일기 보기'})
  const newerButton = screen.getByRole('button', {name: '다음 일기 보기'})

  expect(olderButton).toHaveClass('picture-diary-book__turn--older')
  expect(newerButton).toHaveClass('picture-diary-book__turn--newer')
  expect(olderButton.parentElement).toHaveClass('picture-diary-book__pager')

  fireEvent.click(olderButton)
  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'older')
  expect(book).toHaveAttribute('data-turn-phase', 'settle')
  turns.advance(32)
  const olderTurn = book.querySelector('[data-picture-diary-turn-sheet]')
  expect(olderTurn).toBeInTheDocument()
  expect(olderTurn).toHaveAttribute('data-turn-origin', 'bottom')
  expect(olderTurn?.getAttribute('style')).toContain('--picture-diary-flat-clip')
  expect(olderTurn?.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent(
    '어제는 산책했다.',
  )
  expect(olderTurn?.querySelector('[data-picture-diary-turn-face="back"]')).toHaveTextContent(
    '어제는 산책했다.',
  )
  expect(olderButton).toBeDisabled()
  expect(newerButton).toBeDisabled()
  expect(olderButton).not.toBeVisible()
  expect(newerButton).not.toBeVisible()

  finishPageTurn()
  expect(onGoOlder).toHaveBeenCalledOnce()
  expect(book).not.toHaveAttribute('data-turn-direction')
  expect(book.querySelector('[data-picture-diary-turn-sheet]')).not.toBeInTheDocument()

  fireEvent.click(newerButton)
  expect(onGoNewer).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'newer')
  const newerTurn = book.querySelector('[data-picture-diary-turn-sheet]')
  expect(newerTurn?.querySelector('[data-picture-diary-turn-face="front"]')).toHaveTextContent(
    '오늘은 자전거를 탔다.',
  )
  finishPageTurn()
  expect(onGoNewer).toHaveBeenCalledOnce()
})

it('should close the back cover after the last entry and reopen it toward that entry', () => {
  const onCloseBackCover = vi.fn()
  const onOpenBackCover = vi.fn()
  const lastEntry = {
    createdAt: '2026-09-01T03:00:00.000Z',
    date: '2026-09-01',
    id: 'last-entry',
    strokes: [],
    text: '가장 오래된 일기',
    updatedAt: '2026-09-01T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const {unmount} = renderEditor({
    canCloseBackCover: true,
    currentEntry: lastEntry,
    onCloseBackCover,
  })

  const book = screen.getByLabelText('일기장')
  const olderButton = screen.getByRole('button', {name: '이전 일기 보기'})
  expect(olderButton).toBeEnabled()
  const olderEdge = book.querySelector('[data-picture-diary-edge="older"]')!
  fireEvent.pointerDown(olderEdge, {button: 0, clientX: 8, clientY: 180, pointerId: 1})
  fireEvent.pointerMove(window, {clientX: 600, clientY: 180, pointerId: 1})
  const closingCover = book.querySelector('[data-picture-diary-cover-turn]')
  expect(closingCover).toHaveAttribute('data-turn-direction', 'older')
  expect(closingCover?.getAttribute('style')).toContain('--picture-diary-hard-angle')
  expect(onCloseBackCover).not.toHaveBeenCalled()
  fireEvent.pointerUp(window, {clientX: 600, clientY: 180, pointerId: 1})
  finishPageTurn()
  expect(onCloseBackCover).toHaveBeenCalledOnce()

  unmount()
  renderEditor({
    backCoverClosed: true,
    canGoNewer: true,
    newerEntry: lastEntry,
    onOpenBackCover,
  })

  const closedBook = screen.getByLabelText('일기장')
  const closedSpread = closedBook.querySelector('.picture-diary-book__spread')
  expect(closedBook.closest('.picture-diary-book__frame')).toHaveAttribute(
    'data-picture-diary-cover-closed',
  )
  expect(closedSpread).toHaveClass('picture-diary-book__spread--closed')
  expect(closedSpread?.children).toHaveLength(1)
  expect(closedBook.querySelector('[data-picture-diary-cover="back"]')).toBeInTheDocument()
  const newerButton = screen.getByRole('button', {name: '다음 일기 보기'})
  expect(newerButton).toBeEnabled()
  const newerEdge = closedBook.querySelector('[data-picture-diary-edge="newer"]')!
  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 180, pointerId: 2})
  fireEvent.pointerMove(window, {clientX: 200, clientY: 180, pointerId: 2})
  expect(onOpenBackCover).not.toHaveBeenCalled()
  expect(
    screen.getByLabelText('일기장').querySelector('[data-picture-diary-cover-turn]'),
  ).toHaveAttribute('data-turn-direction', 'newer')
  fireEvent.pointerUp(window, {clientX: 200, clientY: 180, pointerId: 2})
  finishPageTurn()
  expect(onOpenBackCover).toHaveBeenCalledOnce()
})
