/** @vitest-environment jsdom */
import {cleanup, fireEvent, render, screen} from '@solidjs/testing-library'
import {afterEach, describe, expect, it, vi} from 'vitest'
import {SFindBar} from '../SFindBar'

describe('SFindBar', () => {
  afterEach(cleanup)

  it('should preserve Enter activation on the search buttons without moving results from keydown', () => {
    const onMove = vi.fn()
    render(() => <SFindBar query="code" count={2} onMove={onMove} />)
    for (const name of ['이전 검색 결과', '다음 검색 결과', '파일 내 검색 닫기']) {
      expect(fireEvent.keyDown(screen.getByRole('button', {name}), {key: 'Enter'})).toBe(true)
    }
    expect(onMove).not.toHaveBeenCalled()
  })

  it('should focus the query, navigate in both directions, and close with Escape', () => {
    const onMove = vi.fn()
    const onClose = vi.fn()
    render(() => <SFindBar query="code" count={2} active={0} onMove={onMove} onClose={onClose} />)
    const input = screen.getByRole('textbox', {name: '파일 내 검색어'})
    expect(document.activeElement).toBe(input)
    expect(screen.getByRole('status').textContent).toBe('1/2')
    fireEvent.keyDown(input, {key: 'Enter'})
    fireEvent.keyDown(input, {key: 'Enter', shiftKey: true})
    fireEvent.keyDown(input, {key: 'Escape'})
    expect(onMove.mock.calls).toEqual([[1], [-1]])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('should disable navigation with no matches and ignore composition keystrokes', () => {
    const onMove = vi.fn()
    render(() => <SFindBar query="missing" count={0} onMove={onMove} />)
    expect(
      (screen.getByRole('button', {name: '다음 검색 결과'}) as HTMLButtonElement).disabled,
    ).toBe(true)
    expect(screen.getByRole('status').textContent).toBe('결과 없음')
    fireEvent.keyDown(screen.getByRole('textbox', {name: '파일 내 검색어'}), {
      isComposing: true,
      key: 'Enter',
    })
    expect(onMove).not.toHaveBeenCalled()
  })
})
