/** @vitest-environment jsdom */

import {fireEvent, screen} from '@solidjs/testing-library'
import {expect, it, vi} from 'vitest'
import type {PictureDiaryEntry} from '../../../../features/picture-diary'
import {finishPageTurn, renderEditor, sampleEntry, turns} from './fixtures/editor'

it('should use accessible names without visible section labels or a control-shaped textarea', () => {
  renderEditor()

  const heading = screen.getByLabelText('날짜').closest('.picture-diary-book__heading')

  expect(screen.queryByText('오늘의 그림')).not.toBeInTheDocument()
  expect(screen.queryByText('오늘의 이야기')).not.toBeInTheDocument()
  expect(screen.getByLabelText('그림 그리는 곳')).toBeInTheDocument()
  expect(screen.getByLabelText('그림일기 내용')).not.toHaveClass('rounded-control')
  expect(heading?.querySelector('button')).toBeNull()
  expect(screen.queryByRole('button', {name: '한 획 취소'})).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '그림 지우기'})).not.toBeInTheDocument()
  expect(screen.getByRole('button', {name: '그림 그리기'})).toHaveAttribute(
    'aria-haspopup',
    'dialog',
  )
})

it('should keep drawing and writing together on the current page', () => {
  renderEditor()

  const currentPage = screen
    .getByLabelText('그림일기 내용')
    .closest('[data-picture-diary-page="current"]')
  const drawing = screen.getByLabelText('그림 그리는 곳')
  const saveButton = screen.getByRole('button', {name: '일기 저장'})
  const book = currentPage?.closest('[data-picture-diary-book]')
  const previousPage = book?.querySelector('.picture-diary-book__page--previous')
  const currentFooter = currentPage?.querySelector('.picture-diary-book__footer--current')

  expect(book?.querySelector('[data-picture-diary-cover]')).not.toBeInTheDocument()
  expect(book?.querySelector('[data-picture-diary-page-block]')).not.toBeInTheDocument()
  expect(book?.querySelector('[data-picture-diary-spine]')).not.toBeInTheDocument()
  expect(currentPage).toContainElement(drawing)
  expect(currentFooter).toContainElement(saveButton)
  expect(screen.queryByText('2')).not.toBeInTheDocument()
  expect(previousPage).toHaveClass('picture-diary-book__back-cover--inside')
  expect(previousPage?.querySelector('.picture-diary-book__cover-mark')).toBeInTheDocument()
})

it('should replace the writing page with aligned read-only entries while browsing', () => {
  const onDeleteEntry = vi.fn()
  const currentEntry = {
    createdAt: '2026-09-04T03:00:00.000Z',
    date: '2026-09-04',
    id: 'current-entry',
    strokes: [{points: [{x: 0.75, y: 0.25}]}],
    text: '오늘은 자전거를 탔다.',
    updatedAt: '2026-09-04T03:00:00.000Z',
    version: 1,
    weather: {condition: 'clear', temperatureCelsius: 24.4},
  } satisfies PictureDiaryEntry
  const previousEntry = {
    ...currentEntry,
    createdAt: '2026-09-03T03:00:00.000Z',
    date: '2026-09-03',
    id: 'previous-entry',
    text: '어제는 산책했다.',
    updatedAt: '2026-09-03T03:00:00.000Z',
  } satisfies PictureDiaryEntry
  renderEditor({currentEntry, onDeleteEntry, previousEntry})

  const currentPage = screen
    .getByText('오늘은 자전거를 탔다.')
    .closest('[data-picture-diary-page="current"]')
  const previousPage = screen
    .getByText('어제는 산책했다.')
    .closest('[data-picture-diary-page="previous"]')

  expect(screen.queryByLabelText('날짜')).not.toBeInTheDocument()
  expect(screen.queryByLabelText('그림일기 내용')).not.toBeInTheDocument()
  expect(screen.queryByRole('button', {name: '일기 저장'})).not.toBeInTheDocument()
  expect(currentPage).toHaveAttribute('data-picture-diary-mode', 'read')
  expect(currentPage?.querySelector('.picture-diary-book__heading')).toHaveTextContent(
    '2026. 09. 04.',
  )
  expect(currentPage?.querySelector('.picture-diary-book__weather')).toHaveTextContent('맑음 · 24°')
  expect(previousPage?.querySelector('.picture-diary-book__heading')).toHaveTextContent(
    '2026. 09. 03.',
  )
  expect(previousPage?.querySelector('.picture-diary-book__weather')).toHaveTextContent(
    '맑음 · 24°',
  )
  expect(screen.getAllByLabelText('저장된 일기의 그림')).toHaveLength(2)
  expect(screen.queryByRole('button', {name: '현재 일기 삭제'})).not.toBeInTheDocument()

  const previousDelete = screen.getByRole('button', {name: '2026. 09. 03. 일기 삭제'})
  fireEvent.click(previousDelete)
  expect(onDeleteEntry).not.toHaveBeenCalled()
  expect(previousDelete).toHaveAccessibleName('2026. 09. 03. 일기를 삭제하려면 한 번 더 누르세요.')
  expect(previousDelete).toHaveTextContent('한 번 더 눌러 삭제')
  fireEvent.click(previousDelete)
  expect(onDeleteEntry).toHaveBeenCalledWith('previous-entry')
})
