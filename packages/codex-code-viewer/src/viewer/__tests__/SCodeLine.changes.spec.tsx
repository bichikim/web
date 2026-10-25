/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, expect, it, vi} from 'vitest'
import {SCodeLine} from '../SCodeLine'
import type {ChangeHunk} from '../../shared/change-contracts'

afterEach(cleanup)
it.each(['added', 'modified', 'deleted'] as const)(
  'should open a %s change without selecting the line',
  (kind) => {
    const change: ChangeHunk = {
      kind,
      newLines: ['new'],
      newStart: 1,
      oldLines: ['old'],
      oldStart: 1,
    }
    const open = vi.fn()
    render(() => (
      <SCodeLine line={1} tokens={[]} selected={false} change={change} onOpenChange={open} />
    ))
    const label = {added: '추가 변경 보기', deleted: '삭제 변경 보기', modified: '수정 변경 보기'}
    fireEvent.click(screen.getByRole('button', {name: `1 · ${label[kind]}`}))
    expect(open).toHaveBeenCalledWith(change)
    expect(screen.getByRole('button', {name: '1줄 선택'})).toHaveAttribute('aria-pressed', 'false')
  },
)
it('should place folding nearest the code and keep change clicks independent', () => {
  const change: ChangeHunk = {
    kind: 'modified',
    newLines: ['new'],
    newStart: 11,
    oldLines: ['old'],
    oldStart: 11,
  }
  const fold = vi.fn()
  const open = vi.fn()
  render(() => (
    <SCodeLine
      line={11}
      tokens={[]}
      change={change}
      folding
      foldEnd={15}
      onToggleFold={fold}
      onOpenChange={open}
    />
  ))
  const folding = screen.getByRole('button', {name: '11줄 접기'})
  const number = screen.getByRole('button', {name: '11줄 선택'})
  const marker = screen.getByRole('button', {name: '11 · 수정 변경 보기'})
  expect(screen.getAllByRole('button')).toEqual([number, marker, folding])
  fireEvent.click(folding)
  expect(fold).toHaveBeenCalledOnce()
  expect(open).not.toHaveBeenCalled()
  fireEvent.click(marker)
  expect(open).toHaveBeenCalledExactlyOnceWith(change)
  expect(fold).toHaveBeenCalledOnce()
})
