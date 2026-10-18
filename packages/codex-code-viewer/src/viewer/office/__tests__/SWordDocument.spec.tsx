/** @vitest-environment jsdom */
import {cleanup, render, screen, within} from '@solidjs/testing-library'
import {afterEach, describe, expect, it} from 'vitest'
import {parseDocumentHtml} from '../parse-document-html'
import {SWordDocument} from '../SWordDocument'

describe('SWordDocument', () => {
  afterEach(cleanup)
  it('should display headings, table cells, embedded images and external links semantically', () => {
    render(() => (
      <SWordDocument
        nodes={parseDocumentHtml(
          '<h1>보고서</h1><table><tr><td>내용</td></tr></table><img alt="문서 그림" src="data:image/png;base64,AA=="><a href="https://example.com">참고</a>',
        )}
      />
    ))
    expect(screen.getByRole('heading', {level: 1, name: '보고서'})).toBeTruthy()
    expect(within(screen.getByRole('table')).getByRole('cell', {name: '내용'})).toBeTruthy()
    expect(screen.getByRole('img', {name: '문서 그림'}).getAttribute('src')).toBe(
      'data:image/png;base64,AA==',
    )
    expect(screen.getByRole('link', {name: '참고'}).getAttribute('rel')).toBe('noopener noreferrer')
  })
  it('should show conversion warnings and empty-document feedback', () => {
    render(() => <SWordDocument nodes={[]} warnings={['알 수 없는 문서 스타일']} />)
    expect(screen.getByRole('status').textContent).toContain('표시할 내용이 없습니다')
    expect(screen.getByText('알 수 없는 문서 스타일')).toBeTruthy()
  })
})
