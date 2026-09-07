/** @vitest-environment jsdom */

import {fireEvent, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../../features/picture-diary'
import {finishPageTurn, renderEditor, sampleEntry, turns} from './fixtures/editor'

it('should cancel a turn when its responsive page geometry changes before completion', () => {
  turns.setCompact(true)
  const onGoNewer = vi.fn()
  renderEditor({canGoNewer: true, onGoNewer})
  const book = screen.getByLabelText('일기장')
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  turns.advance(100)
  turns.setCompact(false)
  finishPageTurn()
  expect(onGoNewer).not.toHaveBeenCalled()
  expect(book).not.toHaveAttribute('data-turn-phase')
})

it('should animate a short fold back without changing the page', () => {
  const onGoOlder = vi.fn()
  renderEditor({canGoOlder: true, onGoOlder, previousEntry: sampleEntry('previous')})
  const book = screen.getByLabelText('일기장')
  fireEvent.pointerDown(book.querySelector('[data-picture-diary-edge="older"]')!, {
    button: 0,
    clientX: 0,
    clientY: 200,
    pointerId: 1,
  })
  const pager = book.parentElement!.querySelector('.picture-diary-book__pager')!
  expect(pager).not.toBeVisible()
  fireEvent.pointerMove(window, {clientX: 20, clientY: 200, pointerId: 1})
  expect(pager).not.toBeVisible()
  fireEvent.pointerUp(window, {clientX: 20, clientY: 200, pointerId: 1})
  expect(book).toHaveAttribute('data-turn-phase', 'settle')
  expect(pager).not.toBeVisible()
  finishPageTurn()
  expect(pager).toBeVisible()
  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).not.toHaveAttribute('data-turn-phase')
})

it('should not fling after holding a partially folded page still', () => {
  const onGoOlder = vi.fn()
  renderEditor({canGoOlder: true, onGoOlder, previousEntry: sampleEntry('previous')})
  const book = screen.getByLabelText('일기장')
  fireEvent.pointerDown(book.querySelector('[data-picture-diary-edge="older"]')!, {
    button: 0,
    clientX: 0,
    clientY: 200,
    pointerId: 1,
  })
  turns.advance(16)
  fireEvent.pointerMove(window, {clientX: 100, clientY: 200, pointerId: 1})
  turns.advance(1000)
  fireEvent.pointerUp(window, {clientX: 100, clientY: 200, pointerId: 1})
  finishPageTurn()
  expect(onGoOlder).not.toHaveBeenCalled()
})

it('should complete without animation when reduced motion is requested', () => {
  turns.reduceMotion()
  const onGoNewer = vi.fn()
  renderEditor({canGoNewer: true, currentEntry: sampleEntry('current'), onGoNewer})
  fireEvent.click(screen.getByRole('button', {name: '다음 일기 보기'}))
  expect(onGoNewer).toHaveBeenCalledExactlyOnceWith()
  expect(screen.getByLabelText('일기장')).not.toHaveAttribute('data-turn-phase')
})

it('should turn pages by dragging and releasing the outer page edges', () => {
  const onGoNewer = vi.fn()
  const onGoOlder = vi.fn()
  const currentEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'current-entry',
    strokes: [],
    text: '오늘 일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  const previousEntry = {
    ...currentEntry,
    date: '2026-09-03',
    id: 'previous-entry',
    text: '이전 일기',
  } satisfies PictureDiaryEntry
  renderEditor({
    canGoNewer: true,
    canGoOlder: true,
    currentEntry,
    onGoNewer,
    onGoOlder,
    previousEntry,
  })

  const book = screen.getByLabelText('일기장')
  const olderEdge = book.querySelector('[data-picture-diary-edge="older"]')!
  const newerEdge = book.querySelector('[data-picture-diary-edge="newer"]')!

  fireEvent.pointerDown(olderEdge, {button: 0, clientX: 8, clientY: 180, pointerId: 1})
  fireEvent.pointerMove(window, {clientX: 600, clientY: 182, pointerId: 1})
  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-phase', 'move')
  const liveFold = book.querySelector('[data-picture-diary-turn-sheet]')
  expect(liveFold?.getAttribute('style')).toContain('--picture-diary-flat-clip')
  expect(liveFold?.getAttribute('style')).toContain('--picture-diary-flap-transform')
  fireEvent.pointerUp(window, {clientX: 600, clientY: 182, pointerId: 1})

  expect(onGoOlder).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'older')
  expect(book).toHaveAttribute('data-turn-phase', 'settle')
  finishPageTurn()
  expect(onGoOlder).toHaveBeenCalledOnce()

  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 180, pointerId: 2})
  fireEvent.pointerMove(window, {clientX: 200, clientY: 178, pointerId: 2})
  fireEvent.pointerUp(window, {clientX: 200, clientY: 178, pointerId: 2})

  expect(onGoNewer).not.toHaveBeenCalled()
  expect(book).toHaveAttribute('data-turn-direction', 'newer')
  finishPageTurn()
  expect(onGoNewer).toHaveBeenCalledOnce()
})

it('should ignore short, vertical, reversed, and cancelled edge drags', () => {
  const onGoNewer = vi.fn()
  const onGoOlder = vi.fn()
  const entry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'entry',
    strokes: [],
    text: '일기',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
  } satisfies PictureDiaryEntry
  renderEditor({
    canGoNewer: true,
    canGoOlder: true,
    currentEntry: entry,
    onGoNewer,
    onGoOlder,
    previousEntry: entry,
  })

  const book = screen.getByLabelText('일기장')
  const olderEdge = book.querySelector('[data-picture-diary-edge="older"]')!
  const newerEdge = book.querySelector('[data-picture-diary-edge="newer"]')!

  fireEvent.pointerDown(olderEdge, {button: 0, clientX: 8, clientY: 100, pointerId: 1})
  fireEvent.pointerMove(window, {clientX: 28, clientY: 101, pointerId: 1})
  fireEvent.pointerUp(window, {clientX: 28, clientY: 101, pointerId: 1})
  finishPageTurn()

  fireEvent.pointerDown(olderEdge, {
    button: 0,
    clientX: 8,
    clientY: 100,
    pointerId: 2,
    pointerType: 'touch',
  })
  fireEvent.pointerMove(window, {
    clientX: 13,
    clientY: 190,
    pointerId: 2,
    pointerType: 'touch',
  })
  fireEvent.pointerUp(window, {clientX: 13, clientY: 190, pointerId: 2, pointerType: 'touch'})

  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 100, pointerId: 3})
  fireEvent.pointerMove(window, {clientX: 850, clientY: 100, pointerId: 3})
  fireEvent.pointerUp(window, {clientX: 850, clientY: 100, pointerId: 3})
  finishPageTurn()

  fireEvent.pointerDown(newerEdge, {button: 0, clientX: 792, clientY: 100, pointerId: 4})
  fireEvent.pointerMove(window, {clientX: 200, clientY: 100, pointerId: 4})
  fireEvent.pointerCancel(window, {clientX: 200, clientY: 100, pointerId: 4})
  finishPageTurn()

  expect(onGoOlder).not.toHaveBeenCalled()
  expect(onGoNewer).not.toHaveBeenCalled()
  expect(book).not.toHaveAttribute('data-turn-direction')
})
